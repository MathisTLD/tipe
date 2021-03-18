let verbose = ref false

let main =
  begin
    let options = ref Algorithm.default_options in
    let speclist = [("-v", Arg.Set verbose, "Enables verbose mode")] in
    let usage_msg = "Calculate flight plan"
    in Arg.parse speclist (fun opts_string -> options := Algorithm.options_from_string opts_string) usage_msg;
    Algorithm.verbose := !verbose;
    Algorithm.run !options;
  end

let () = main
