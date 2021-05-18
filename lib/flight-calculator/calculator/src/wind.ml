open Geo

(* weather utils *)
let p0 = 1013.25 (* pressure at altitude 0m in mb *)
(* constantes d'aide *)
let k1 = 145366.45 *. 0.3048
let k2 = 0.190284
(* converts pressure-altitude in mb to an altitude in metters *)
(* see : https://www.weather.gov/media/epz/wxcalc/pressureAltitude.pdf *)
let pressure_to_altitude p =
  (1. -. (p /. p0) ** k2) *. k1
let altitude_to_pressure a =
  ((((-. a) /. k1) -. 1.) ** (1./.k2)) *. p0

(* interpolation utils *)
(* arr should be a sorted array (asc) *)
(* if 'a = 'b you can use 'compare' as cmp argument *)
let index_sandwich (cmp: 'a -> 'b -> int) (arr: ('a array)) (x: 'b): int * int =
  let n = Array.length arr in
  if n = 0 then failwith "array should not be empty"
  else (
    if cmp arr.(0) x >= 0 then (0,0)
    else (
      let i = ref 0 in
      (* FIXME: dichotomous search much faster (but this implementation is ok for small arrays) *)
      while (cmp arr.(!i) x < 0) && (!i < n) do
        i := !i + 1;
      done;
      if(!i = n - 1) then (n-1,n-1)
      else if cmp arr.(!i) x = 0 then (!i,!i)
      else (!i, !i + 1)
    )
  )


let get_date_id t =
  Printf.sprintf "%sT%02d" (Utils.Date.to_yyyymmdd t) (Utils.Date.get_hours t)

let print_handle handle =
  let open Grib in
  let print_key key =
    let description = try (
      let size = Handle.get_size handle key in
      let dtype = match (Handle.get_native_type handle key) with
        | Handle.String_type -> "string"
        | Handle.Int_type -> "int"
        | Handle.Float_type -> "float" in
      Printf.sprintf "type: %s, nb: %d" dtype size
    )
      with Invalid_argument(err) -> "??? invalid argument: "^err in
    (* fails with the following keys: _x, section3Padding *)
    print_endline (Printf.sprintf "--- %s: %s" key description) in
  Handle.Keys.iter print_key handle

class wind_component handle =
  let open Grib in
  let get_int = Handle.get_int handle in
  let get_float = Handle.get_float handle in
  let get_string = Handle.get_string handle in
  let name = Handle.get_string handle "name" in
  let level = Handle.get_int handle "level" in
  let altitude = pressure_to_altitude (float_of_int level) in
  (* in GRIB2 Ni is the number of columns and Nj the number of rows *)
  let nj = get_int "Nj" in
  object (self)
    initializer (
      (* ensure this is the right type of data *)
      assert (name = "U component of wind" || name = "V component of wind");
      assert (get_string "parameterUnits" = "m s-1");

      (* ensure we will be able to map this grib handle to a Geo.grid *)
      assert (get_float "latitudeOfFirstGridPointInDegrees" = 90.);
      assert (get_float "latitudeOfLastGridPointInDegrees" = -90.);
      let dx = get_float "iDirectionIncrementInDegrees" in
      let dy = get_float "jDirectionIncrementInDegrees" in
      assert (dx = dy);
      assert (get_float "longitudeOfFirstGridPointInDegrees" = 0.);
      assert (get_float "longitudeOfLastGridPointInDegrees" = 360. -. dx);
    )
    val level = level
    val component = get_string "shortName" (* either "u" or "v" *)
    (* we extract values here instead of doing it every time we want to read a value as this is a very costly task *)
    val values = Handle.get_float_array handle "values"
    val grid = new grid ~altitudes:[|altitude|] (nj - 1)
    (* expose properties *)
    method level = level
    method altitude = altitude
    method component = component
    method grib_handle = handle

    method get_value {lat;lon} =
      let around = grid#get_around_2D ({lat;lon}) in
      Array.map (fun (i,j) -> (
            let point = (i,j,0) in
            (* TODO: remplacer par de l'interpolation bilinéaire *)
            (* let d = distance loc (grid#location_of_point point) in *)
            values.((grid#id_of_point point))
          )
        ) around |> Array.fold_left (fun m x -> m+.(x/.4.)) 0.
  end

class wind_level (u: wind_component) (v:wind_component ) =
  let level = u#level in
  let altitude = u#altitude in
  object (self)
    val level = level
    val altitude = altitude
    val u = u
    val v = v
    initializer (
      (* check u and v are what's expected *)
      (* this might already have been done before *)
      assert (u#component = "u");
      assert (v#component = "v");
      assert (u#level = v#level);
    )
    method level = level
    method altitude = altitude
    method get_value loc2D =
      (u#get_value loc2D ,v#get_value loc2D)

  end

class wind_date (id: string) =
  let open Utils in
  let day = String.sub id 0 8 in
  let hours = String.sub id 9 2 in
  let dir = "data/weather/wind/"^day in
  let file = (if Sys.is_directory dir then
                (
                  let files = Array.to_list (Sys.readdir dir) in
                  let re = Str.regexp ("^"^hours) in
                  let matched = List.filter (fun file -> Str.string_match re file 0) files in
                  match matched with
                  | [] -> failwith (Printf.sprintf "No wind file for date %s" id)
                  | file::_ -> dir^"/"^file
                ) else failwith (Printf.sprintf "No wind file for date %s" id)
             ) in
  let rec regroup l =
    match l with
    | u::v::tl -> (
        (* check u and v are what's expected *)
        assert (u#component = "u");
        assert (v#component = "v");
        assert (u#level = v#level);
        let layer = new wind_level u v in
        layer::(regroup tl)
      )
    | [] -> []
    | _ -> failwith "the number of grib wind_data messages must be even" in
  let layers = Grib.Handle.filter_map_file (fun handle -> (
        (* we only want U and V components of wind *)
        let name = Grib.Handle.get_string handle "name" in
        if not (name = "U component of wind" || name = "V component of wind") then None
        else (
          (* map_file is closing handles after f is applied so we copy handles in order to get ones that won't close until we want so *)
          let grib_handle = Grib.Handle.get_message_copy handle |> Grib.Handle.of_message in
          Some (new wind_component grib_handle)
        )
      )
    ) file
               |> List.sort (fun a b -> compare (a#altitude,a#component) (b#altitude,b#component))
               |> regroup
               |> Array.of_list in
  object (self)
    val layers = layers
    method layers = layers
    method get_value loc =
      (* FIXME: should use the appropriate level_layer *)
      let (i1,i2) = index_sandwich (fun (layer: wind_level) (altitude: float) -> compare layer#altitude altitude) layers loc.alt in
      let loc2D = {lat=loc.lat;lon=loc.lon} in
      if i1 = i2 then layers.(i1)#get_value loc2D
      else (
        (* we have to interpolate value *)
        let v1 = layers.(i1)#get_value loc2D in
        let v2 = layers.(i2)#get_value loc2D in
        (* FIXME: provide real interpolation and not average value *)
        ((fst v1 +. fst v2) /. 2.,(snd v1 +. snd v2) /. 2.)
      )
  end

class wind_data_provider =
  object (self)
    val cache = Hashtbl.create 10
    method get_date_data (id: string) =
      match Hashtbl.find_opt cache id with
      | None -> (
          let data = new wind_date id in (* takes a lot of time *)
          Hashtbl.add cache id data;
          Utils.Output.verbose (Printf.sprintf "loaded wind data for date %s" id);
          data
        )
      | Some data -> data
    method get_value (date: float) (loc: location)  : (float * float) =
      (* FIXME: we should use data for date before and after *)
      let date_id = get_date_id date in
      let data = self#get_date_data date_id in
      data#get_value loc
  end

let provider = new wind_data_provider

let get_wind = provider#get_value
