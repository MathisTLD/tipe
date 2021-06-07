open Geo
open Wind
open Utils

(** fonctions d'aide pour les vecteurs *)

(** produit scalaire (sert à calculer le vent de face en fct du cap) *)
let prod_scal a b =
  (fst a *. fst b) +. (snd a *. snd b)

(** rotation d'angle 90° (sens trigo) (sert à calculer le vent de travers en fct du cap) *)
let rot ((x,y): float * float) =
  (-.y,x)

(** performances pendant une phase (montée/croisière/descente)  *)
type phase_performances = {
  speed: float; (** m/s *)
  fuelFlow: float; (** m^3/s *)
}
(** performances dans toutes les phases  *)
type performances = {
  climb: phase_performances;
  cruise: phase_performances;
  descent: phase_performances;
}
(** propriétés d'un appareil  *)
type properties = {
  name : string;
  fuelType : string;
  performances : performances;
}
(** contient les propriétés des différents appareils *)
let (aircrafts: (string, properties) Hashtbl.t) = Hashtbl.create 100
(** charge les propriétés des différents appareils disponibles à partir d'un fichier json  *)
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


(** coût d'un déplacement élémentaire  *)
type move_cost = {
  time: Date.Span.t; (** durée du déplacement *)
  fuel: float; (** carburant consommé en m3 *)
}

(** représente un avion. [new aircraft "Beech Baron"] crée une instance d'avion avec les propriétés correspondant au nom "Beech Baron" *)
class aircraft  model =
  object (self)
    val props = Hashtbl.find aircrafts model
    (* inspired by https://www.eucass.eu/doi/EUCASS2017-254.pdf *)
    method get_speed (date: Date.t option) (tas: float)  (loc: location) (bearing: float) =
      let wind = match date with
        | Some date -> get_wind date loc
        | None -> (0.,0.) in
      let cape = (Float.sin bearing, Float.cos bearing) in
      let w_a = prod_scal wind cape in (* along-track wind *)
      let w_x = prod_scal wind (rot cape) in (* cross-track wind *)
      (* FIXME: return nan if tas < abs(w_x) we should throw error if so *)
      (sqrt ((tas *. tas) -. (w_x *. w_x))) +. w_a
    method get_move_cost ?(date = None) (loc1: location) (loc2: location)  =
      let phase = (if loc1.alt = loc2.alt then props.performances.cruise else if loc1.alt < loc2.alt then props.performances.climb else props.performances.descent) in
      let bearing = Geo.bearing loc1 loc2 in
      let speed = self#get_speed date phase.speed loc1 bearing in (* FIXME: should get speed at point between loc1 and loc2 *)
      let distance = Geo.distance loc1 loc2 in
      let time_sec = distance /. speed in
      let time = Date.Span.of_sec time_sec in
      let fuel = phase.fuelFlow *. time_sec in
      (* Printf.sprintf "time: %e, fuel: %e" time fuel |> Utils.Output.verbose; *)
      {time; fuel}
  end
