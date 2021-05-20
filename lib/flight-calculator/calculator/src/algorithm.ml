open Geo

type options = {
  departure : location;
  arrival : location;
  precision : int;
  directions : int;
  weather: bool;
  aircraft: string;
} [@@deriving yojson]

let options_from_string str =
  let json = Yojson.Safe.from_string str in
  options_of_yojson json

type node = {
  point: point;
  date: float;
  fuel: float;
}
let create_node ?(fuel = -1.) point date =
  { point;date;fuel }
type edge_cost = {
  time: float;
  fuel: float;
}
type edge = {
  nodes: node * node;
  cost: edge_cost;
}

type step = {
  loc: location;
  fuel: float;
  date: int;
} [@@deriving yojson_of]
let step_of_node grid node =
  {
    loc=grid#location_of_point node.point;
    fuel=node.fuel;
    date=Float.round (node.date *. 1000.) |> Float.to_int
  }

type results = {
  options: options;
  graph: step list;
  path: step list;
  time: int; (* time in ms *)
} [@@deriving yojson_of]


module Heap = Pairing_heap

let dijkstra options =
  print_endline "running dijkstra";
  let aircraft = new Aircraft.aircraft options.aircraft in
  (* FIXME: add altitudes that corresponds to airecraft's specs *)
  let grid = new grid ~altitudes:[|0.;10000.|] options.precision in
  let departure_point = grid#get_closest options.departure in
  let arrival_point = grid#get_closest options.arrival in
  let compare_edges ({nodes=(_,a)}:edge) ({nodes=(_,b)}:edge) = compare a.date b.date in
  let queue = Heap.create ~cmp:compare_edges () in
  let queue_cache = Hashtbl.create (grid#ny*grid#nx/2) in
  let headings_horizontal = Geo.gen_headings options.directions in
  let headings_up = List.map (fun heading -> Up::heading) headings_horizontal in
  let headings_down = List.map (fun heading -> Down::heading) headings_horizontal in
  let headings_top = headings_horizontal @ headings_down in
  let headings_floor = headings_up in
  let headings_all = headings_horizontal @ headings_up @ headings_down in
  let create_edge (node_from: node) heading =
    let point_to = grid#resolve_next_point node_from.point heading in
    let loc_from = grid#location_of_point node_from.point in
    let loc_to = grid#location_of_point point_to in
    let {time;fuel}: Aircraft.cost = aircraft#get_cost ~use_weather:options.weather node_from.date loc_from loc_to in
    let node_to = {
      point=point_to;
      date=node_from.date +. time;
      fuel=node_from.fuel -. fuel;
    } in
    {nodes=(node_from,node_to);cost={time;fuel}} in
  let add_edges node =
    List.iter (fun heading -> (
          let edge = create_edge node heading in
          let arrival_point = (snd edge.nodes).point in
          (* TODO: optimize insertions to limit queue size *)
          (* see https://github.com/janestreet/core_kernel/blob/master/pairing_heap/src/pairing_heap.mli *)
          let cached = Hashtbl.find_opt queue_cache arrival_point in
          if(Option.is_none cached) then (
            let new_token = Heap.add_removable queue edge in
            Hashtbl.add queue_cache arrival_point (new_token,edge);
          ) else (
            let (prev_token,prev_edge) = Option.get cached in
            if(compare_edges edge prev_edge < 0) then (
              let new_token = Heap.update queue prev_token edge in
              Hashtbl.replace queue_cache arrival_point (new_token,edge)
            )
            (* else do nothing and ignore current edge *)
          )
        )
      ) (
      (* add eventual vertical movements *)
      match node.point with
      | (_,_,0) -> headings_floor
      | (_,_,k) when k = grid#nz - 1 -> headings_top
      |_->headings_all
    ) in
  add_edges {point=departure_point;date=Utils.Date.now ();fuel = -1.};
  let i = ref 0 in
  let max_i = 10000000 in
  let found = ref false in
  let seen = Hashtbl.create (options.precision*options.precision/2) in
  while not !found && !i < max_i do
    if Heap.is_empty queue then failwith "no more edges"
    else (
      i := !i + 1;
      if(!i mod 1000 = 0) then print_endline (Printf.sprintf "%d iteration, %d nodes processed" !i (Hashtbl.length seen));
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
  let path = get_path [fst (Hashtbl.find seen arrival_point)] |> List.map (fun node -> step_of_node grid node) in
  let graph = Hashtbl.fold (fun _ (node,_) acc -> node::acc) seen [] |> List.map (fun node -> step_of_node grid node) in
  (path,graph)


let run options =
  let open Printf in
  let open Utils in
  "Options:" |> Output.verbose;
  Printf.sprintf "- departure: " ^ (location_to_string options.departure) |> Output.verbose;
  Printf.sprintf "- arrival: " ^ (location_to_string options.arrival) |> Output.verbose;
  Printf.sprintf "- precision: %d" options.precision |> Output.verbose;
  let time_start = Utils.Date.now () in
  let (path,graph) = dijkstra options in
  let time = ((Utils.Date.now ()) -. time_start) *. 1000. |> Float.round |> Float.to_int in
  let results = {options;graph;path;time} in
  sprintf "done in %dms" results.time |> Output.verbose;
  sprintf "processed %d nodes" (List.length results.graph) |> Output.verbose;
  sprintf "path includes %d nodes" (List.length results.path) |> Output.verbose;
  Yojson.Safe.to_string (yojson_of_results results) |> Output.event "results"
