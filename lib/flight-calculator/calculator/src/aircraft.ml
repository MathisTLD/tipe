open Geo
open Wind
(* vect utilities *)
let prod_scal a b =
  (fst a *. fst b) +. (snd a *. snd b)

let dilate (x,y) a =
  (a*.x,a*.y)

let rot ((x,y): float * float) =
  (-.y,x)

let norm (x,y) =
  sqrt ((x*.x) +. (y*.y))

let heading_to_vect heading =
  let rec aux heading =
    match heading with
    | [] -> (0.,0.)
    | [N] -> (0.,1.)
    | [S] -> (0.,-1.)
    | [E] -> (1.,0.)
    | [W] -> (-1.,0.)
    | d::rest -> (
        let a = (aux [d]) in
        let b = (aux rest) in
        (fst a +. fst b,snd a +. snd b)
      ) in
  let (x,y) = aux heading in
  dilate (x,y) (1. /. (norm (x,y)))

(* FIXME: should use verticalSpeed on vertical phases *)
type phase_performances = {
  speed: float;
  fuelFlow: float;
}
type performances = {
  climb: phase_performances;
  cruise: phase_performances;
  descent: phase_performances;
}
type properties = {
  name : string;
  fuelType : string;
  performances : performances;
}
(*  *)
let (aircrafts: (string, properties) Hashtbl.t) = Hashtbl.create 100
let load_aircrafts () =
  let open Yojson.Safe in
  let json = from_file "data/aircrafts.json" in
  List.iter (fun aircraft_json -> (
        let name = Util.member "name" aircraft_json |> Util.to_string in
        let fuelType = Util.member "fuelType" aircraft_json |> Util.to_string in
        let performances = Util.member "performances" aircraft_json |> (
            fun performances_json -> (
                let extract phase =
                  let phase_json = Util.member phase performances_json in
                  let speed = Util.member "speed" phase_json |> Util.to_float in
                  let fuelFlow = Util.member "fuelFlow" phase_json |> Util.to_float in
                  {speed;fuelFlow} in
                {
                  climb = extract "climb";
                  cruise  = extract "cruise";
                  descent = extract "descent";
                }
              )
          ) in
        let props = {name;fuelType;performances} in
        Hashtbl.add aircrafts name props
      )) (Util.values json);;
load_aircrafts ();;


type cost = {
  time: float;
  fuel: float;
}

class aircraft  ?(model = "Beech Baron") (grid: Geo.grid) =
  object (self)
    val props = Hashtbl.find aircrafts model
    (* inspired by https://www.eucass.eu/doi/EUCASS2017-254.pdf *)
    method get_speed (tas: float) (date: float) (loc: location) (heading: heading) =
      let wind = get_wind date  loc in
      (* let wind = (0.,0.) in *)
      let cape = heading_to_vect heading in
      let w_a = prod_scal wind cape in (* along-track wind *)
      let w_x = prod_scal wind (rot cape) in (* cross-track wind *)
      (sqrt ((tas *. tas) -. (w_x *. w_x))) +. w_a
    method get_cost (date: float) (point1: point) (heading: heading)  =
      let point2 = grid#resolve_next_point point1 heading in
      let loc1 = grid#location_of_point point1 in
      let loc2 = grid#location_of_point point2 in
      let phase = (if loc1.alt = loc2.alt then props.performances.cruise else if loc1.alt < loc2.alt then props.performances.climb else props.performances.descent) in
      let speed = self#get_speed phase.speed date loc1 heading in
      let distance = grid#distance_between_points point1 point2 in
      let time = distance /. speed in
      let fuel = phase.fuelFlow *. time in
      (* Printf.sprintf "time: %e, fuel: %e" time fuel |> Utils.Output.verbose; *)
      {time; fuel}
  end