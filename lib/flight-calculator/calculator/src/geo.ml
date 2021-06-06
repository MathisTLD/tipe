(* geo constants *)
let earth_radius = 6371000. (* in meters *)

(* Better use records with floats: https://stackoverflow.com/questions/10481910/whats-the-difference-between-records-and-tuples-in-ocaml#:~:text=The%20other%20differences%20are%20at,you%20can%20use%20object%20types.&text=Moreover%2C%20records%20can%20have%20mutable%20fields%2C%20tuples%20can't. *)
type location = {
  lat : float;
  lon : float;
  alt : float;
} [@@deriving yojson]
type location_2D = {
  lat : float;
  lon : float;
}

type 'a surrounding ={
  top_right: 'a;
  top_left: 'a;
  bottom_left: 'a;
  bottom_right: 'a
}


let location_to_string ?(format="dd") (loc: location) =
  let deg_to_dms dd =
    let d = Float.floor dd in
    let m = Float.floor ((dd -. d) *. 60.) in
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

let to_rad deg =
  deg *. (Float.pi /. 180.)

let distance (loc1: location) (loc2: location) =
  let lat1 = to_rad loc1.lat in
  let lat2 = to_rad loc2.lat in
  let lon1 = to_rad loc1.lon in
  let lon2 = to_rad loc2.lon in
  let mh = (loc1.alt +. loc2.alt) /. 2. in
  let dh = loc2.alt -. loc1.alt in
  let open Float in
  let d = 2. *. (earth_radius +. mh) *.
          asin (
            sqrt (
              (pow (sin((lat2 -. lat1) /. 2.)) 2.)
              +. cos(lat1) *. cos(lat2) *. (pow (sin ((lon2 -. lon1) /. 2.))  2.)
            )
          ) in
  sqrt ((d*.d) +. (dh*.dh))

(* https://www.igismap.com/formula-to-find-bearing-or-heading-angle-between-two-points-latitude-longitude/ *)
(* Bearing would be measured from North direction i.e 0° bearing means North, 90° bearing is East, 180° bearing is measured to be South, and 270° to be West. *)
let bearing (loc1: location) (loc2: location) =
  let dlon = to_rad (loc2.lon -. loc1.lon) in
  let lat1 = to_rad loc1.lat in
  let lat2 = to_rad loc2.lat in
  let open Float in
  let x = cos lat2 *. sin dlon in
  let y = (cos lat1 *. sin lat2) -. (sin lat1 *. cos lat2 *. cos dlon) in
  atan2 x y


type direction = | N | S | E | W | Up | Down
type heading = direction list
(* generates n-th set of headings *)
let gen_headings n =
  let t = Array.make (8*n) (0,0) in
  for k = -n to n do
    let i = k + n in
    t.(i) <- (n,k);
    t.(2*n+1+i) <- (-n,k);
    if(abs k < n) then (
      t.(4*n+2+i-1) <- (k,n);
      t.(6*n+1+i-1) <- (k,-n);
    )
  done;
  Array.to_list (Array.map (fun (dx_,dy_) -> (
        let rec gcd a b =
          if b = 0 then a else (
            let c = a mod b in gcd b c
          ) in
        let p = gcd (abs dx_) (abs dy_) in
        let dx = (if p>1 then dx_/p else dx_) in
        let dy = (if p>1 then dy_/p else dy_) in
        let t = Array.make ((abs dx) + (abs dy)) (if dx < 0 then W else E) in
        for i = 0 to (abs dy) - 1 do
          t.(i) <- (if dy < 0 then S else N)
        done;
        Array.to_list t
      )) t)

let heading_to_string heading =
  List.map (fun d -> match d with
      | N -> "n"| S -> "s" | E ->"e" |W->"w" |Up -> "⬆" | Down -> "⬇") heading |> String.concat ""

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

type point = int * int * int
(* grid object *)
class grid  ?(altitudes = [|0.|]) (n: int) =
  object (self)
    val ny = n+1 (* n equal angle segments for one meridian so n+1 points (including one for each pole) *)
    val nx = 2*n (* 2n equal angle segments for one parallel so 2n points as lat -180 = lat 180 *)
    val nz = Array.length altitudes
    val increment = 180. /. (Float.of_int n)
    (* then 0 <= i <= n and 0 <= j <= 2n-1 *)
    method nx = nx
    method ny = ny
    method nz = nz
    method increment = increment
    method id_of_point ((i,j,k): point) =
      k*nx*ny + i*ny + j
    method location_of_point ((i,j,k): point) =
      let lat = deg_to_lat (increment *. (Float.of_int i)) in
      let lon = deg_to_lon (increment *. (Float.of_int j)) in
      let alt = altitudes.(k) in
      {lat;lon;alt}
    method distance_between_points (a:point) (b:point) =
      (* consider adding caching *)
      distance (self#location_of_point a) (self#location_of_point b)
    method get_float_coordinates_2D ({lat;lon}: location_2D) =
      let i_float = (lat_to_deg lat) /. increment in
      let j_float = (lon_to_deg lon) /. increment in
      (i_float,j_float)
    method get_closest (loc: location) =
      let (i_float,j_float) = self#get_float_coordinates_2D {lat=loc.lat;lon=loc.lon} in
      let i = Float.to_int (Float.round i_float) in
      let j = Float.to_int (Float.round j_float) mod nx in
      let (_,_,k) = Array.fold_left
          (fun (i,md,mi) h -> ( let d = abs_float (loc.alt -. h) in
                                if mi < 0 then (i+1,d,i)
                                else if d < md then (i+1,d,i)
                                else  (i+1,md,mi)   ))
          (0,0.,-1) altitudes in
      (i,j,k)
    method get_surrounding_2D ({lat;lon}: location_2D) =
      let (i_float,j_float) = self#get_float_coordinates_2D {lat;lon} in
      let i1 = Float.to_int (Float.floor i_float) in
      let i2 = Float.to_int (Float.ceil i_float) in
      let j1 = Float.to_int (Float.floor j_float) in
      let j2 = Float.to_int (Float.floor j_float) mod nx in
      let top_left = (i1,j1) in
      let top_right = (i1,j2) in
      let bottom_left = (i2,j1) in
      let bottom_right = (i2,j2) in
      {top_right;top_left;bottom_left;bottom_right}
    method resolve_next_point (point: point) (heading: heading): point =
      let get_opposite ((i,j,k): point): point =
        (i,(j+(nx/2)) mod nx,k) in
      let rec flip_heading (heading: heading) : heading =
        match heading with
        | [] -> []
        | N::rest -> S::(flip_heading rest)
        | S::rest -> N::(flip_heading rest)
        | x::rest -> x::(flip_heading rest) in
      let rec resolve (point: point) (heading: heading) =
        match heading,point with
        | [],_ -> point
        | N::rest,(i,j,k) -> (
            if i = 0 then (
              let opposite = get_opposite point in
              resolve opposite (flip_heading heading)
            )
            else resolve (i-1,j,k) rest
          )
        | S::rest,(i,j,k) -> (
            if i = ny-1 then (
              let opposite = get_opposite point in
              resolve opposite (flip_heading heading)
            )
            else resolve (i+1,j,k) rest
          )
        | E::rest,(i,j,k) -> resolve (i,(j+1) mod nx,k) rest
        | W::rest,(i,j,k) -> resolve (i,(if j = 0 then nx - 1 else j - 1),k) rest
        |dir::rest,(i,j,k) -> (
            let k2 = k + (if dir = Up then 1 else -1) in
            if (k2<0 || k2 >= nz) then failwith "altitude not in range";
            (i,j,k2)
          ) in
      resolve point heading
  end
