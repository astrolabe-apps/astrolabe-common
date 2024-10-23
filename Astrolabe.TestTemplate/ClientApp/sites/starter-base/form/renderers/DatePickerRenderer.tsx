import {
  createDataRenderer,
  DataRenderType,
  FieldType,
} from "@react-typed-forms/schemas";
import { Text } from "~/components/ui/text";
import { Button, buttonTextVariants } from "~/components/ui/button";
import { Control, useComputed, useControl } from "@react-typed-forms/core";
import { cn } from "~/lib/utils";
import { CalendarIcon } from "~/lib/icons/CalendarIcon";
import DateTimePicker from "react-native-ui-datepicker/src/DateTimePicker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import dayjs, { Dayjs } from "dayjs";
import { X } from "~/lib/icons/X";

export function createDatePickerRenderer() {
  return createDataRenderer(
    (p) => (
      <DatePickerRenderer
        control={p.control}
        dateTime={p.field.type == FieldType.DateTime}
        readonly={p.readonly}
      />
    ),
    {
      schemaType: [FieldType.Date, FieldType.DateTime],
      renderType: DataRenderType.DateTime,
    },
  );
}

function DatePickerRenderer({
  control,
  readonly,
  enableClear,
  dateTime,
}: {
  control: Control<string | null>;
  readonly?: boolean;
  enableClear?: boolean;
  dateTime?: boolean;
}) {
  const tempSelectedDateTime = useControl<Dayjs | null>(null);

  const dateTimeLabel = useComputed(() => {
    return control.value
      ? dateTime
        ? dayjs(control.value).format("DD/MM/YYYY HH:mm:ss")
        : dayjs(control.value).format("DD/MM/YYYY")
      : null;
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant={"outline"}
          className={"flex flex-row gap-3 justify-start items-center"}
          onPress={() => {
            tempSelectedDateTime.value = control.value
              ? dayjs(control.value)
              : null;
          }}
          disabled={control.disabled || readonly}
        >
          {({ pressed }) => (
            <>
              <CalendarIcon
                className={buttonTextVariants({
                  variant: "outline",
                  className: cn(
                    !dateTimeLabel.value && "opacity-80",
                    pressed && "opacity-60",
                  ),
                })}
                size={18}
              />
              <Text
                className={buttonTextVariants({
                  variant: "outline",
                  className: cn(
                    !dateTimeLabel.value && "opacity-70",
                    pressed && "opacity-50",
                  ),
                })}
              >
                {dateTimeLabel.value ?? "Pick a date"}
              </Text>
              {!!dateTimeLabel.value && enableClear && (
                <Button
                  className="absolute right-0"
                  variant="ghost"
                  size="sm"
                  onPress={() => {
                    control.value = null;
                  }}
                  disabled={control.disabled || readonly}
                >
                  {({ pressed }) => (
                    <X
                      className={cn(
                        "text-muted-foreground",
                        pressed && "opacity-70",
                      )}
                    />
                  )}
                </Button>
              )}
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pick a date</DialogTitle>
        </DialogHeader>
        <DateTimePicker
          mode={"single"}
          date={tempSelectedDateTime.value}
          timePicker={dateTime}
          onChange={(para) => {
            const selectedDate = para.date;
            tempSelectedDateTime.value = dayjs(selectedDate);
          }}
          locale={"en-au"}
          selectedItemColor={"#267150"}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button
              onPress={() => {
                control.touched = true;
                control.value = tempSelectedDateTime.value
                  ? dateTime
                    ? tempSelectedDateTime.value.toISOString()
                    : dayjs(tempSelectedDateTime.value).format("YYYY-MM-DD")
                  : null;
              }}
            >
              <Text>OK</Text>
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
