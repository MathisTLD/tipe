#use "./geo.ml";;
#require "grib";;

open Geo
open Grib

let data_path = "data"

let get_wind (loc: location) =
  let file_path = data_path^"/weather/wind/20210318/11.0p25.f20210318-00.grib2" in
  print_endline ("reading wind from file: "^file_path);
  let print_keys handle =
    print_endline "Keys: ";
    (* let iterator = Iterator.of_handle handle in *)
    let (lat_list,lon_list,val_list) = Iterator.to_lat_lon_value handle in
    match lat_list,lon_list with
    | [],_ | _,[] -> print_endline "noting to read"
    | lat::_,lon::_ -> print_endline ("Iterator's 1st: "^(location_to_string {lat;lon})) in
  let index = Index.read file_path in
  print_endline "got index";
  Index.iter print_keys index;
  print_endline "done";
