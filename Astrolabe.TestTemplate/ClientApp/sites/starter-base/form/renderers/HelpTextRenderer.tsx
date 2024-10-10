import {
  AdornmentPlacement,
  appendMarkupAt,
  ControlAdornment,
  ControlAdornmentType,
  createAdornmentRenderer,
  HelpTextAdornment,
} from "@react-typed-forms/schemas";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { Text } from "~/components/ui/text";
import { Button } from "~/components/ui/button";

export interface ExtendedHelpText {
  helpLabel: string;
}
export function createHelpTextRenderer() {
  return createAdornmentRenderer(
    (p, renderers) => ({
      apply: appendMarkupAt(
        (p.adornment as HelpTextAdornment).placement ??
          AdornmentPlacement.ControlEnd,
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={"outline"} size={"sm"} className={"self-start"}>
              <Text>
                {renderers.renderLabelText(
                  (p.adornment as ExtendedHelpText & ControlAdornment)
                    .helpLabel,
                )}
              </Text>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <Text>
              {renderers.renderLabelText(
                (p.adornment as HelpTextAdornment).helpText,
              )}
            </Text>
          </TooltipContent>
        </Tooltip>,
      ),
      priority: 0,
      adornment: p.adornment,
    }),
    {
      adornmentType: ControlAdornmentType.HelpText,
    },
  );
}
