open Geo

type options = {
  departure : location;
  arrival : location;
  precision : int;
} [@@deriving yojson]
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
  let json = Yojson.Safe.from_string str in
  options_of_yojson json

type node = {
  point: int * int;
  date: float;
  gas: float;
} [@@deriving yojson_of]
let create_node ?(gas = -1.) point date =
  { point;date;gas }
type edge_cost = {
  time: float;
  gas: float;
}
type edge = {
  nodes: node * node;
  cost: edge_cost;
}
let create_edge (grid: Geo.grid) (node_from: node) heading =
  let point_to = grid#resolve_next_point node_from.point heading in
  let distance = grid#distance_between_points node_from.point point_to in
  let speed = 10. in
  let time = distance /. speed in
  let gas = 0. in
  let node_to = {
    point=point_to;
    date=node_from.date +. time;
    gas=node_from.gas +. gas;
  } in
  {nodes=(node_from,node_to);cost={time;gas=0.}}

type results = {
  options: options;
  graph: node list;
  path: node list;
  time: int; (* time in ms *)
} [@@deriving yojson_of]


module Heap = Pairing_heap

let dijkstra options =
  print_endline "running dijkstra";
  let grid = new grid options.precision in
  let departure_point = grid#get_closest options.departure in
  let arrival_point = grid#get_closest options.arrival in
  let queue = Heap.create (fun (a:edge) (b:edge) -> compare a.cost.time b.cost.time) () in
  let headings = Geo.gen_headings 3 in
  let add_edges node =
    List.iter (fun heading -> (
          let edge = create_edge grid node heading in
          (* TODO: consider replacing edge if already in queue with lower priority to limit queue size *)
          Heap.add queue edge
        )
      ) headings in
  add_edges {point=departure_point;date=Utils.Date.now ();gas = -1.};
  let i = ref 0 in
  let max_i = 1000000 in
  let found = ref false in
  let seen = Hashtbl.create (10*options.precision) in
  while not !found && !i < max_i do
    if Heap.is_empty queue then failwith "no more edges"
    else (
      i := !i + 1;
      if(!i mod 100000 = 0) then print_endline (Printf.sprintf "%d iteration, %d nodes processed" !i (Hashtbl.length seen));
      let edge = Heap.pop_exn queue in
      let node = snd edge.nodes in
      if (Hashtbl.mem seen node.point) then ()
      else (
        Hashtbl.add seen node.point (node, fst edge.nodes);
        if node.point = arrival_point then (
          found := true
        ) else (
          add_edges node;
        )
      )
    )
  done;
  if(not !found) then failwith (Printf.sprintf "too much iteration (%d)" !i);
  let rec get_path path =
    match path with
    | {point;_}::_  -> (
        if point = departure_point then path
        else (
          let parent = Hashtbl.find seen point |> snd in
          get_path (parent::path)
        )
      )
    | _ -> failwith "please provide a node" in
  let path = get_path [fst (Hashtbl.find seen arrival_point)] in
  let graph = Hashtbl.fold (fun _ (node,_) acc -> node::acc) seen [] in
  (path,graph)


let run options =
  let open Printf in
  let open Utils in
  "Options:" |> Output.verbose;
  Printf.sprintf "- departure: " ^ (location_to_string options.departure) |> Output.verbose;
  Printf.sprintf "- arrival: " ^ (location_to_string options.arrival) |> Output.verbose;
  Printf.sprintf "- precision: %d" options.precision |> Output.verbose;
  (* let (u,v) = Wind.get_wind options.departure (Utils.Date.now ()) 500 in
     print_endline ("wind: "^(Float.to_string u)^" "^(Float.to_string v)); *)
  let time_start = Utils.Date.now () in
  let (path,graph) = dijkstra options in
  let time = ((Utils.Date.now ()) -. time_start) *. 1000. |> Float.round |> Float.to_int in
  let results = {options;graph;path;time} in
  sprintf "done in %dms" results.time |> Output.verbose;
  sprintf "processed %d nodes" (List.length results.graph) |> Output.verbose;
  sprintf "path includes %d nodes" (List.length results.path) |> Output.verbose;
  Yojson.Safe.to_string (yojson_of_results results) |> Output.event "results"
