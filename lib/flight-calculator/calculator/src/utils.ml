module Date = struct
  include Core_kernel.Time

  (** convertit un temps en chaîne ISO8601 (UTC)  *)
  let to_iso_string (time: t): string =
    to_string_iso8601_basic ~zone:Zone.utc time
  (** convertit une chaîne ISO8601 (UTC) en temps  *)
  let of_iso_string (iso: string): t =
    let time = of_string_gen ~default_zone:(fun () -> Zone.utc) ~find_zone:(fun str -> Zone.utc) iso in
    time
  (** convertit un timestamp javascript en temps  *)
  let of_js_date epoch =
    let span = Float.of_int epoch |> Span.of_ms in
    of_span_since_epoch span
  (** convertit un temps en timestamp javascript  *)
  let to_js_date date =
    let span = to_span_since_epoch date in
    Span.to_ms span |> Float.round |> Float.to_int
end

module Output = struct
  (** log level (0 -> info | 1 -> debug) *)
  let log_level = ref 0
  let set_level lvl =
    match lvl with
    | 0 |1 -> log_level := lvl
    | _ -> failwith (Printf.sprintf "unknown log level: %d" lvl)
  (** affiche la chaîne passée en paramètre uniquement en mode verbose (log_level >= 1) *)
  let verbose str=
    if(!log_level >= 1) then print_endline str
  (** affiche des données au format json entourées par des séparateur déclenchant des évènement au niveau du serveur json qui execute le calculateur *)
  let event ev data =
    Printf.sprintf "---%s" ev |> print_endline;
    print_endline data;
    print_endline "---"
end
