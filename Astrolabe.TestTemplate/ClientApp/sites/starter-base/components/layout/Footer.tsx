import { View } from "react-native";
import React from "react";
import { Image } from "expo-image";
import { OpenURLButton, OpenURLButtonProps } from "~/components/OpenURLButton";
import { Text } from "~/components/ui/text";
import { SocialMediaButton } from "~/components/SocialMediaButton";

export default function Footer() {
  return (
    <View className={"flex-1"}>
      <FooterTop />
      <FooterBottom />
    </View>
  );
}

function FooterTop() {
  return (
    <View className="flex flex-col gap-4 px-4 py-10 bg-[#404041] ">
      <Text className={"font-extrabold text-2xl color-white"}>
        Need to speak to us?
      </Text>
      <FooterCard
        icon={
          <Image
            source={require("~/assets/images/tasmania-map.svg")}
            style={{ width: 36, height: 36, tintColor: "#fff" }}
          />
        }
        links={[
          {
            url: "https://www.service.tas.gov.au/find-a-service-centre",
            urlText: "Find a Service Centre",
          },
        ]}
      />
      <FooterCard
        icon={
          <Image
            source={require("~/assets/images/phone-footer.svg")}
            style={{ width: 36, height: 40 }}
          />
        }
        links={[
          {
            url: "tel:1300135513",
            urlText: "1300 135 513",
            title: "Call us:",
          },
          {
            url: "tel:+61361699017",
            urlText: "+613 6169 9017",
            title: "International:",
          },
        ]}
      />
      <FooterCard
        icon={
          <Image
            source={require("~/assets/images/ask-us-footer.svg")}
            style={{ width: 36, height: 36 }}
          />
        }
        links={[
          {
            url: "/contactus-auth",
            urlText: "Submit an enquiry online",
            title: "Ask us:",
            containerClasses: "flex-col",
          },
        ]}
      />
      <View className={"flex flex-row flex-wrap items-center gap-2"}>
        <View className={"flex flex-row items-center gap-2"}>
          <Image
            source={require("~/assets/images/intepreter-icon.svg")}
            style={{ width: 50, height: 33 }}
          />
          <Text className={"color-white"}>Need an interpreter?</Text>
        </View>
        <OpenURLButton url={"tel:131450"} urlText={"131 450"} title={"Call:"} />
      </View>

      <Text className={"color-white"}>
        Phone lines open{" "}
        <Text className={"font-bold color-white"}>8:00am - 5:30pm</Text>{" "}
        weekdays.
      </Text>

      <View className={"flex flex-row flex-wrap items-center"}>
        <Text className={"color-white "}>
          Service Centres open various hours -{" "}
        </Text>
        <OpenURLButton
          url={"https://www.service.tas.gov.au/find-a-service-centre"}
          urlText={"find yours"}
          urlClasses={"font-bold"}
        />
      </View>

      <View className={"flex flex-col gap-2"}>
        <Text className={"color-white"}>
          You can also contact us on social media.
        </Text>
        <SocialMediaButton
          url={"https://www.facebook.com/ServiceTasmania"}
          icon={
            <Image
              source={require("~/assets/images/facebook-icon-footer.svg")}
              style={{ width: 30, height: 30 }}
            />
          }
        />
      </View>

      <FooterRecognition />
    </View>
  );
}

function FooterCard({
  icon,
  links,
}: {
  icon: React.JSX.Element;
  links: OpenURLButtonProps[];
}) {
  return (
    <View className={"flex flex-row items-center gap-4 p-4 bg-[#4f4f4f]"}>
      {icon}
      <View className={"flex flex-col gap-2"}>
        {links.map((link) => (
          <OpenURLButton key={link.url} {...link} />
        ))}
      </View>
    </View>
  );
}

function FooterRecognition() {
  return (
    <View
      className={
        "border border-solid border-[#fff] px-4 py-6 text-justify mt-4"
      }
    >
      <Text className={"color-white"}>
        We acknowledge and pay our respects to all Aboriginal people in
        Tasmania; their identity and culture.
      </Text>
    </View>
  );
}

function FooterBottom() {
  return (
    <View className="bg-[#333] flex flex-col gap-4 px-4 py-10">
      <OpenURLButton
        url={
          "https://www.service.tas.gov.au/myservicetas/personal-information-protection"
        }
        urlText={"Personal information protection"}
        urlUnderline={false}
        urlClasses={"font-bold"}
      />
      <OpenURLButton
        url={"https://www.tas.gov.au/stds/codi.htm"}
        urlText={"Copyright and disclaimer"}
        urlUnderline={false}
        urlClasses={"font-bold"}
      />
      {/*In app navigation*/}
      <OpenURLButton
        url={"/registrationtermsandconditions/"}
        urlText={"Personal information protection"}
        urlUnderline={false}
        urlClasses={"font-bold"}
      />
      <OpenURLButton
        url={"https://www.service.tas.gov.au/accessibility"}
        urlText={"Accessibility"}
        urlUnderline={false}
        urlClasses={"font-bold"}
      />
      <Image
        source={require("~/assets/images/logo-light.svg")}
        style={{ width: 152, height: 40 }}
      />
    </View>
  );
}
