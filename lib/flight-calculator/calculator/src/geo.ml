(* geo constants *)
let earth_radius = 6371000. (* in meters *)

(* Better use records with floats: https://stackoverflow.com/questions/10481910/whats-the-difference-between-records-and-tuples-in-ocaml#:~:text=The%20other%20differences%20are%20at,you%20can%20use%20object%20types.&text=Moreover%2C%20records%20can%20have%20mutable%20fields%2C%20tuples%20can't. *)
type location = {
  lat : float;
  lon : float;
}
let location_to_string ?(format="dd") (loc: location) =
  let deg_to_dms dd =
    let d = Float.floor dd in
    let m = (dd -. d) *. 60. in
    let s = (dd -. d -. m /. 60.) *. 3600. in
    let to_str x = Printf.sprintf "%02d" (Float.to_int x) in
    Printf.sprintf "%s° %s' %s''" (to_str d) (to_str m) (to_str s) in
  match format with
  | "dd" -> Printf.sprintf "%s, %s" (Float.to_string loc.lat) (Float.to_string loc.lon)
  | "dms" -> (
      let lat = (if loc.lat < 0. then "S " else "N ")^deg_to_dms (Float.abs loc.lat) in
      let lon = (if loc.lon < 0. then "E " else "W ")^deg_to_dms (Float.abs loc.lon) in
      Printf.sprintf "%s %s" lat lon
    )
  | _ -> failwith "Unsupported location format: "^format
let distance loc1 loc2 =
  let open Float in
  let lat1 = loc1.lat *. (pi /. 180.) in
  let lat2 = loc2.lat *. (pi /. 180.) in
  let lon1 = loc1.lon *. (pi /. 180.) in
  let lon2 = loc2.lon *. (pi /. 180.) in
  2. *. earth_radius *.
  asin (
    sqrt (
      (pow (sin((lat2 -. lat1) /. 2.)) 2.)
      +. cos(lat1) *. cos(lat2) *. (pow (sin ((lon2 -. lon1) /. 2.))  2.)
    )
  )
type direction = | N | S | E | W
type heading = direction list
(* generates a list of 4*n headings *)
let rec gen_headings n : heading list =
  match n with
  | 0 -> [] (* should never happen *)
  | 1 -> [[N];[S];[E];[W]]
  | _ -> (
      let e_l = Array.to_list (Array.make (n-1) E) in
      let w_l = Array.to_list (Array.make (n-1) E) in
      (N::e_l)::(N::w_l)::(S::e_l)::(S::w_l)::(gen_headings (n-1))
    )

type point = int * int
(*
deg
   x: 0 -> 360 (0 is lon = 0)
   y: 0 -> 180 (0 is lat = -90)
*)
let lat_to_deg lat =
  90. -. lat
let deg_to_lat deg =
  90. -. deg
let lon_to_deg lon =
  if lon < 0. then 360. +. lon
  else lon
let deg_to_lon deg =
  if deg > 180. then deg -. 360.
  else deg

class grid (n: int) =
  object (self)
    val ny = n+1 (* n equal angle segments for one meridian so n+1 points (including one for each pole) *)
    val nx = 2*n (* 2n equal angle segments for one parallel so 2n points as lat -180 = lat 180 *)
    (* then 0 <= i <= n and 0 <= j <= 2n-1 *)
    method location_from_point ((i,j): point) =
      let lat = deg_to_lat (180. *. (Float.of_int i) /. (Float.of_int ny)) in
      let lon = deg_to_lon (360. *. (Float.of_int j) /. (Float.of_int nx)) in
      {lat;lon}
    method get_closest (loc: location) =
      let i = Float.to_int (Float.round ((lat_to_deg loc.lat) /. 180. *. float_of_int ny)) in
      let j = Float.to_int (Float.round ((lon_to_deg loc.lon) /. 360. *. float_of_int nx)) in
      (i,j)
    method get_around ({lat;lon}: location) =
      let i_float = (lat_to_deg lat) /. 180. in
      let j_float = (lon_to_deg lon) /. 180. in
      let top_left = (Float.to_int (Float.floor i_float),Float.to_int (Float.floor j_float)) in
      let top_right = (Float.to_int (Float.floor i_float),Float.to_int (Float.ceil j_float)) in
      let bottom_left = (Float.to_int (Float.ceil i_float),Float.to_int (Float.floor j_float)) in
      let bottom_right = (Float.to_int (Float.ceil i_float),Float.to_int (Float.ceil j_float)) in
      (top_right,top_left,bottom_left,bottom_right)
    method resolve_next_point (point: point) (heading: heading) =
      let get_opposite ((i,j): point): point =
        (i,j+(nx/2) mod nx) in
      let rec flip_heading (heading: heading) : heading =
        match heading with
        | [] -> []
        | N::rest -> S::(flip_heading rest)
        | S::rest -> N::(flip_heading rest)
        | x::rest -> x::(flip_heading rest) in
      let rec resolve (point: point) (heading: heading) =
        match heading,point with
        | [],_ -> point
        | N::rest,(i,j) -> (
            if i = 0 then (
              let opposite = get_opposite point in
              resolve opposite (flip_heading heading)
            )
            else resolve (i-1,j) rest
          )
        | S::rest,(i,j) -> (
            if i = ny-1 then (
              let opposite = get_opposite point in
              resolve opposite (flip_heading heading)
            )
            else resolve (i+1,j) rest
          )
        | E::rest,(i,j) -> resolve (i,j+1 mod nx) rest
        | W::rest,(i,j) -> resolve (i,if j = 0 then nx-1 else j-1) rest in
      resolve point heading
  end