import "i18next";
import enAuth           from "../languages/auth/en.json";
import enUserManagement from "./UserManagment/en.json";
import enLayout         from "./Layout/en.json";

declare module "i18next" {
    interface CustomTypeOptions {
        resources: {
            auth:            (typeof enAuth)["auth"];
            user_management: (typeof enUserManagement)["user_management"];
            layout:          (typeof enLayout)["layout"];
        };
    }
}