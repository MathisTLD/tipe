let main =
  begin
    let options_string = ref "" in
    let speclist = [("-v", Arg.Unit (fun verbose -> Utils.Output.set_level 1), "Enables verbose mode")] in
    let usage_msg = "Calculate flight plan"
    in Arg.parse speclist (fun opts_string -> options_string := opts_string) usage_msg;
    let options = Algorithm.options_from_string (!options_string) in
    Algorithm.run options;
    exit 0;
  end

let () = main
