import { RNText } from "./RNText";
import { useState } from "react";
import { RNButton } from "./RNButton";
import { SafeAreaView } from "react-native";

export type RNDateTimeProps = {};

export function RNDateTime({}: RNDateTimeProps) {
  const [date, setDate] = useState(new Date(1598051730000));
  const [mode, setMode] = useState("date");
  const [show, setShow] = useState(false);

  const onChange = (event: any, selectedDate: any) => {
    const currentDate = selectedDate;
    setShow(false);
    setDate(currentDate);
  };

  const showMode = (currentMode: any) => {
    setShow(true);
    setMode(currentMode);
  };

  const showDatepicker = () => {
    showMode("date");
  };

  const showTimepicker = () => {
    showMode("time");
  };

  return (
    <SafeAreaView>
      <RNButton onPress={showDatepicker} />
      <RNButton onPress={showTimepicker} />
      <RNText>selected: {date.toLocaleString()}</RNText>
      {/*{show && (*/}
      {/*  <DateTimePicker*/}
      {/*    testID="dateTimePicker"*/}
      {/*    value={date}*/}
      {/*    mode={"date"}*/}
      {/*    is24Hour={true}*/}
      {/*    onChange={onChange}*/}
      {/*  />*/}
      {/*)}*/}
    </SafeAreaView>
  );
}
