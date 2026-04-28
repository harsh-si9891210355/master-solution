import "i18next";
import enAuth from "./Auth/en.json";
// import enCommon from "./Layout/en.json";

declare module "i18next" {
    interface CustomTypeOptions {
        defaultNS: "auth";
        resources: {
            auth: (typeof enAuth)["auth"];
            // common: (typeof enCommon)["common"];
        };
    }
}