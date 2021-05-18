module Date = struct
  let to_yyyymmdd t =
    let tm = Unix.gmtime t in
    Printf.sprintf "%04d%02d%02d" (tm.tm_year+1900) (tm.tm_mon+1) tm.tm_mday

  let get_hours t =
    (Unix.gmtime t).tm_hour

  let now () =
    Unix.gettimeofday ()
end

module Output = struct
  let log_level = ref 0
  let set_level lvl =
    match lvl with
    | 0 |1 -> log_level := lvl
    | _ -> failwith (Printf.sprintf "unknown log level: %d" lvl)
  let verbose str=
    if(!log_level >= 1) then print_endline str
  let event ev data =
    Printf.sprintf "---%s" ev |> print_endline;
    print_endline data;
    print_endline "---"
end
