open Geo
open Utils

type options = {
  departure : location;
  arrival : location;
  precision : int;
  directions : int;
  weather: bool;
  aircraft: string;
  algorithm: string;
} [@@deriving yojson]

let options_from_string str =
  let json = Yojson.Safe.from_string str in
  options_of_yojson json

type node = {
  point: point;
  date: Date.t;
  fuel: float;
}
let create_node ?(fuel = 0.) point date =
  { point;date;fuel }

type edge = {
  nodes: node * node;
  cost: Aircraft.move_cost;
}

type step = {
  loc: location;
  fuel: float;
  date: int;
} [@@deriving yojson_of]
let step_of_node grid node =
  let open Date in
  {
    loc=grid#location_of_point node.point;
    fuel=node.fuel;
    date=Float.round (to_span_since_epoch node.date |> Span.to_ms) |> Float.to_int
  }

type results = {
  options: options;
  graph: step list;
  path: step list;
  time: int; (* time in ms *)
} [@@deriving yojson_of]

module Heap = Pairing_heap

let run options =
  let open Printf in
  let open Utils in
  "Options:" |> Output.verbose;
  Printf.sprintf "- departure: " ^ (location_to_string options.departure) |> Output.verbose;
  Printf.sprintf "- arrival: " ^ (location_to_string options.arrival) |> Output.verbose;
  Printf.sprintf "- algorithm: %s" options.algorithm |> Output.verbose;
  Printf.sprintf "- precision: %d" options.precision |> Output.verbose;
  let time_start = Utils.Date.now () in
  let aircraft = new Aircraft.aircraft options.aircraft in
  (* FIXME: add altitudes that corresponds to airecraft's specs *)
  let grid = new grid ~altitudes:[|0.;10000.|] options.precision in
  let departure_point = grid#get_closest options.departure in
  let arrival_point = grid#get_closest options.arrival in
  let queue = Heap.create ~cmp:(fun (a,_) (b,_) -> compare a b) () in
  let queue_cache = Hashtbl.create (grid#ny*grid#nx/2) in
  let headings_horizontal = Geo.gen_headings options.directions in
  let headings_up = List.map (fun heading -> Up::heading) headings_horizontal in
  let headings_down = List.map (fun heading -> Down::heading) headings_horizontal in
  let headings_top = headings_horizontal @ headings_down in
  let headings_floor = headings_up in
  let headings_all = headings_horizontal @ headings_up @ headings_down in
  let calculate_distance = match options.algorithm with
    | a when a = "dijkstra" -> fun edge -> (snd edge.nodes).date
    | a when a = "a*" -> (
        let arrival_loc = grid#location_of_point arrival_point in
        fun edge -> (
            let open Date in
            let node = (snd edge.nodes) in
            (* we add estimated time to arrival (by ignoring wind) to actual date when we will reach that node *)
            add node.date (aircraft#get_move_cost (grid#location_of_point node.point) arrival_loc).time
          ))
    | a -> failwith (Printf.sprintf "unknown algorithm %s" a)  in
  let create_edge (node_from: node) heading =
    let point_to = grid#resolve_next_point node_from.point heading in
    let loc_from = grid#location_of_point node_from.point in
    let loc_to = grid#location_of_point point_to in
    let {time;fuel}: Aircraft.move_cost = if options.weather then aircraft#get_move_cost ~date:(Some node_from.date) loc_from loc_to else aircraft#get_move_cost loc_from loc_to in
    let node_to = {
      point=point_to;
      date= Date.add node_from.date time;
      fuel=node_from.fuel -. fuel;
    } in
    {nodes=(node_from,node_to);cost={time;fuel}} in
  let add_edges node =
    List.iter (fun heading -> (
          let edge = create_edge node heading in
          let arrival_point = (snd edge.nodes).point in
          (* optimize insertions to limit queue size *)
          (* for Heap docs see https://github.com/janestreet/core_kernel/blob/master/pairing_heap/src/pairing_heap.mli *)
          let cached = Hashtbl.find_opt queue_cache arrival_point in
          let distance = calculate_distance edge in (* distance represents a time here *)
          if(Option.is_none cached) then (
            let new_token = Heap.add_removable queue (distance, edge) in
            Hashtbl.add queue_cache arrival_point (new_token, distance, edge);
          ) else (
            let (prev_token,prev_distance,prev_edge) = Option.get cached in
            if(distance < prev_distance) then (
              let new_token = Heap.update queue prev_token (distance, edge) in
              Hashtbl.replace queue_cache arrival_point (new_token, distance, edge)
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
  add_edges {point=departure_point;date=Utils.Date.now ();fuel = 0.};
  let i = ref 0 in
  let max_i = 10000000 in
  let found = ref false in
  let seen = Hashtbl.create (options.precision*options.precision/2) in
  while not !found && !i < max_i do
    if Heap.is_empty queue then failwith "no more edges"
    else (
      i := !i + 1;
      if(!i mod 1000 = 0) then print_endline (Printf.sprintf "%d iteration, %d nodes processed" !i (Hashtbl.length seen));
      let (_,edge) = Heap.pop_exn queue in
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
  let time = (Date.diff (Utils.Date.now ()) time_start) |> Date.Span.to_ms |> Float.round |> Float.to_int in
  let results = {options;graph;path;time} in
  sprintf "done in %dms" results.time |> Output.verbose;
  sprintf "processed %d nodes" (List.length results.graph) |> Output.verbose;
  sprintf "path includes %d nodes" (List.length results.path) |> Output.verbose;
  Yojson.Safe.to_string (yojson_of_results results) |> Output.event "results"
