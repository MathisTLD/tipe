open Geo

let data_path = "data"

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


let get_wind (loc: location) =
  let file_path = data_path^"/weather/wind/20210318/11.0p25.f20210318-00.grib2" in
  print_endline ("reading wind from file: "^file_path);
  Grib.Handle.iter_file (fun h ->
      let open Grib in
      let level = Handle.get_int h "level" in
      let name = Handle.get_string h "shortName" in
      print_endline (Printf.sprintf "%d mb, wind direction %s" level name);
    ) file_path;
  print_endline "done";
