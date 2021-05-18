open Geo

(* converts pressure-altitude in mb to an altitude in metters *)
(* see : https://www.weather.gov/media/epz/wxcalc/pressureAltitude.pdf *)
let pressure_to_altitude p =
  (1. -. (p /. 1013.25) ** 0.190284) *. 145366.45 *. 0.3048

let get_date_id t =
  Printf.sprintf "%sT%02d" (Utils.Date.to_yyyymmdd t) (Utils.Date.get_hours t)

let get_file_for_layers id =
  let open Utils in
  let day = String.sub id 0 8 in
  let hours = String.sub id 9 2 in
  let dir = "data/weather/wind/"^day in
  if Sys.is_directory dir then
    (
      let files = Array.to_list (Sys.readdir dir) in
      let re = Str.regexp ("^"^hours) in
      let matched = List.filter (fun file -> Str.string_match re file 0) files in
      match matched with
      | [] -> failwith (Printf.sprintf "No wind file for date %s" id)
      | file::_ -> dir^"/"^file
    )
  else failwith (Printf.sprintf "No wind file for day %s" day)

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

type layer = {u: Grib.Handle.t; v: Grib.Handle.t}
type layer_table = (int, layer) Hashtbl.t
(* here we cache layer with keys *)
let cache: (string, layer_table) Hashtbl.t = Hashtbl.create 10;;

let load_layers id : layer_table =
  let file = get_file_for_layers id in
  let open Grib in
  let groups = Hashtbl.create 10 in
  Handle.iter_file (fun handle -> (
        let level = Handle.get_int handle "level" in
        let name = Handle.get_string handle "shortName" in
        (* iter_file is closing handles after f is applied so we copy handles in order to get ones that won't close until we want so *)
        let h_copy = Handle.get_message_copy handle |> Handle.of_message in
        if not (Hashtbl.mem groups level) then Hashtbl.add groups level [(name,h_copy)] else
          let group = Hashtbl.find groups level in
          Hashtbl.replace groups level ((name,h_copy)::group);
      )) file;
  let layers = Hashtbl.create 10 in
  Hashtbl.iter (fun level layer_list ->
      match layer_list with
      | [("u",u);("v",v)] | [("v",v);("u",u)] -> (
          Hashtbl.add layers level {u;v};
        )
      | _-> failwith (Printf.sprintf "unsupported layers for level %dmb at file %s" level file)
    ) groups;
  Hashtbl.clear groups; (* FIXME: is this useful ? *)
  layers

let get_layers (id: string) : layer_table=
  if Hashtbl.mem cache id then Hashtbl.find cache id
  else (
    let layers = load_layers id in
    Hashtbl.add cache id layers;
    layers
  )

let test_layers = load_layers (get_date_id (Utils.Date.now ()))
let get_wind date (loc: location)  : (float * float) =
  (* FIXME: we should use layers for date before and after *)
  (* let layers = get_layers (get_date_id date) in *)
  let layers = test_layers in
  (* find the best pressure-altitude approx (FIXME: should interpolate with greater and lower values) *)
  let (_,altitude) = Hashtbl.to_seq_keys layers |> Array.of_seq |> Array.fold_left
                       (fun (md,malt) alt ->
                          ( let d = abs_float (loc.alt -. (pressure_to_altitude (float_of_int alt))) in
                            if alt < 0 then (d,alt)
                            else if d < md then (d,alt)
                            else  (md,alt)   )) (0.,-1) in
  let layer = Hashtbl.find layers altitude in
  (* let layer = Hashtbl.find test_layers 100 in *)
  let u = layer.u in
  let v = layer.v in
  let open Grib in
  let get_val handle =
    (* let near_arr = Nearest.find (Nearest.of_handle handle) handle (loc.lon,loc.lat) in
       let arr = Array.map (fun (near: Nearest.near_t) -> (near.distance, near.value)) near_arr in
       Utils.mean (Array.to_list arr)  *)
    (* FIXME: using random values for now as using real value is too slow *)
    let min = Handle.get_float handle "minimum" in
    let max = Handle.get_float handle "maximum" in
    Array.init 4 (fun _ -> (
          let lat = Random.float 180. -. 90. in
          let lon = Random.float 360. -. 180. in
          let alt = Random.float 100. in
          (distance loc {lat;lon;alt},(Random.float (max -. min)) +. min)
        )) |> Array.to_list |> Utils.mean
  in
  (get_val u,get_val v)
