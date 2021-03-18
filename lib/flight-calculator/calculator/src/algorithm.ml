open Geo

let verbose = ref false

type options = {
  departure : location;
  arrival : location;
  precision : int;
}
let default_options = {
  (* Paris *)
  departure = {
    lat = 48.856614;
    lon = 2.3522219;
  };
  (* NYC *)
  arrival = {
    lat = 40.7127753;
    lon = -74.0059728;
  };
  precision = 100;
}
let options_from_string str =
  let json = Yojson.Basic.from_string str in
  (* Locally open the JSON manipulation functions *)
  let open Yojson.Basic.Util in
  let parse_location json = {
    lat = json |> member "lat" |> to_number;
    lon = json |> member "lon" |> to_number;
  } in
  let departure = json |> member "departure" |> parse_location in
  let arrival = json |> member "arrival" |> parse_location in
  let precision = json |> member "precision" |> to_int in
  {departure;arrival;precision}

(* let dijkstra options =
   let grid = new grid options.precision in
   let departure = grid#get_closest options.departure in
   let arrival = grid#get_closest options.arrival in
   ();; *)
(* let departure_grid = grid#location_from_point (grid#get_closest options.departure) in
   let arrival_grid = grid#location_from_point (grid#get_closest options.arrival) in
   print_endline ("Departure on grid: "^(location_to_string ~format:"dms" departure_grid));
   print_endline ("Arrival on grid: "^(location_to_string ~format:"dms" arrival_grid)) *)

let run options =
  if (!verbose) then (
    print_endline "Running calculator in verbose mode";
    print_endline "Options:";
    print_endline (Printf.sprintf "- departure: " ^ (location_to_string options.departure));
    print_endline (Printf.sprintf "- arrival: " ^ (location_to_string options.arrival));
    print_endline (Printf.sprintf "- precision: %d" options.precision);
  );
  Wind.get_wind options.departure;
