
import "i18next";
import enAuth from "../languages/auth/en.json";
import enUserManagement from "./UserManagment/en.json";

 
declare module "i18next" {
    interface CustomTypeOptions {
        defaultNS: "auth";
        resources: {
            auth: (typeof enAuth)["auth"];
            user_management: (typeof enUserManagement)["user_management"];
        };
    }
}