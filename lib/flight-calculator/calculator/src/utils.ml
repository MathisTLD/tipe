module Date = struct
  include Core_kernel.Time
  (* FIXME: ensure time is UTC *)
  let to_iso_string t =
    to_string_iso8601_basic ~zone:Zone.utc t

  let of_iso_string iso =
    let time = of_string_gen ~default_zone:(fun () -> Zone.utc) ~find_zone:(fun str -> Zone.utc) iso in
    time

  let of_js_date epoch =
    let span = Float.of_int epoch |> Span.of_ms in
    of_span_since_epoch span
  let to_js_date date =
    let span = to_span_since_epoch date in
    Span.to_ms span |> Float.round |> Float.to_int
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
