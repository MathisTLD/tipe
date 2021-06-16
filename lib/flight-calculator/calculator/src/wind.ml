open Geo
open Utils

(** outils météo *)
let p0 = 1013.25 (** pression à l'altitude 0m (en mb) *)

(** constantes d'aide *)

let k1 = 145366.45 *. 0.3048
let k2 = 0.190284
(* converts pressure-altitude in mb to an altitude in metters *)
(* see : https://www.weather.gov/media/epz/wxcalc/pressureAltitude.pdf *)
(** [pressure_to_altitude p] renvoie l'altitude (en m) correspondant à la pression p (en mb) dans le modèle de l'atmosphère isotherme  *)
let pressure_to_altitude p =
  (1. -. (p /. p0) ** k2) *. k1
(** [altitude_to_pressure a] renvoie la pression (en mb) correspondant à l'altitude a (en m) dans le modèle de l'atmosphère isotherme  *)
let altitude_to_pressure a =
  ((((-. a) /. k1) -. 1.) ** (1./.k2)) *. p0


(** outils d'interpolation *)

(** [linear_interpolation val1 val2 u] renvoie l'interpolation linéaire entre les valeur val1 et val2 avec un coeff u in ∈ [0,1] *)
let linear_interpolation val1 val2 u =
  if(not (0. <= u && u <= 1.)) then failwith (Printf.sprintf "u: %f not in [0,1]" u);
  (1. -. u) *. val1 +. u *. val2

(** comme linear_interpolation mais pour deux vecteurs (2D) *)
let linear_interpolation_vect v1 v2 u =
  (linear_interpolation (fst v1) (fst v2) u, linear_interpolation (snd v1) (snd v2) u)

(* arr should be a sorted array (asc) *)
(* if 'a = 'b you can use 'compare' as cmp argument *)
(** [index_sandwich cmp arr x] (arr trié par ordre croissant et de taille n) renvoie (i1,i2) les index des éléments inferieurs et superieurs à x (renvoie (0,0) si x<arr.(0) (n-1,n-1) si x>arr.(n-1) et (i,i) si x = arr.(i)) *)
let index_sandwich (cmp: 'a -> 'b -> int) (arr: ('a array)) (x: 'b): int * int =
  let n = Array.length arr in
  if n = 0 then failwith "array should not be empty"
  else (
    if cmp arr.(0) x >= 0 then (0,0)
    else (
      let i = ref 0 in
      (* dichotomous search is much faster (but this implementation is ok for small arrays) *)
      while (cmp arr.(!i) x < 0) && (!i < n) do
        i := !i + 1;
      done;
      if(!i = n - 1) then (n-1,n-1)
      else if cmp arr.(!i) x = 0 then (!i,!i)
      else (!i - 1, !i)
    )
  )

(** crée un id sous la forme YYYY-MM-DDTHH pour une date donée (correspond à la date d'un fichier GRIB2) *)
let date_id_of_time t =
  let open Utils.Date in
  let iso = to_iso_string t in
  Scanf.sscanf (String.sub iso 0 13) "%u-%u-%uT%u" (fun y m d h -> Printf.sprintf "%04u%02u%02uT%02u" y m d h)

(** réciproque de date_id_of_time  *)
let time_of_date_id id =
  let y = String.sub id 0 4 in
  let m = String.sub id 4 2 in
  let d = String.sub id 6 2 in
  let h = String.sub id 9 2 in
  let open Utils.Date in
  let iso = Printf.sprintf "%s-%s-%sT%s:00:00Z" y m d h in
  of_iso_string iso

(** affiche les clés d'un objet de type Grib.Handle.t (utilisé pour le debug) *)
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

(** représente une componentsnte du vent à une date donnée à une altitude donnée  *)
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
      let points_2D = grid#get_surrounding_2D ({lat;lon}) in
      let (i,j) = grid#get_float_coordinates_2D {lat;lon} in
      let u = i -. Float.of_int (fst points_2D.top_left) in
      let v = j -. Float.of_int (snd points_2D.top_left) in
      let values = (
        let {top_right;top_left;bottom_left;bottom_right} = points_2D in
        let values = [|top_right;top_left;bottom_left;bottom_right|] |> Array.map (fun (i,j) -> (
              values.((grid#id_of_point (i,j,0)))
            )
          ) in
        {top_right=values.(0);top_left=values.(1);bottom_left=values.(2);bottom_right=values.(3)}
      ) in
      let value_left = linear_interpolation values.top_left values.bottom_left u  in
      let value_right = linear_interpolation values.top_right values.bottom_right u  in
      linear_interpolation value_left value_right v
  end

(** représente le vent (vecteur (u,v)) à une date donnée à une altitude donnée  *)
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

(** représente le vent à une date donnée (sur plusieurs niveaux d'altitude)  *)
class wind_date (id: string) =
  let open Utils in
  let date = time_of_date_id id in
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
    val date = date
    method layers = layers
    method date = date
    method get_value loc =
      let (i1,i2) = index_sandwich (fun (layer: wind_level) (altitude: float) -> compare layer#altitude altitude) layers loc.alt in
      let loc2D = {lat=loc.lat;lon=loc.lon} in
      if i1 = i2 then layers.(i1)#get_value loc2D
      else (
        (* we have to interpolate value *)
        let layer1 = layers.(i1) in
        let layer2 = layers.(i2) in
        if(not (layer1#altitude < loc.alt && loc.alt < layer2#altitude)) then failwith (Printf.sprintf "invalid layer altitudes: %f not in [%f,%f]" loc.alt layer1#altitude layer2#altitude);
        let v1 = layers.(i1)#get_value loc2D in
        let v2 = layers.(i2)#get_value loc2D in
        let u = (loc.alt -. layer1#altitude) /. (layer2#altitude -. layer1#altitude) in
        linear_interpolation_vect v1 v2 u
      )
  end

(** permet d'obtenir le vent à une certaine date et une certaine altitude  *)
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
    method get_value (date: Date.t)  (loc: location)  : (float * float) =
      let open Date in
      let data1 = self#get_date_data (date_id_of_time date) in (* data just before *)
      let data2 = self#get_date_data (date_id_of_time (add date (Span.of_sec 3600.))) in (* data just after *)
      let v1 = data1#get_value loc in
      let v2 = data2#get_value loc in
      let u = ((diff date data1#date) |> Span.to_sec) /. ((diff data2#date data1#date) |> Span.to_sec) in
      linear_interpolation_vect v1 v2 u
  end

let provider = new wind_data_provider

(** permet d'obtenir le vent sans instancier un nouveau wind_data_provider *)
let get_wind = provider#get_value
