import "i18next";
import enAuth           from "../languages/auth/en.json";
import enUserManagement from "./UserManagment/en.json";
import enLayout         from "./Layout/en.json";
import enCamera         from "./camera/en.json";
import enUsecase        from "./usecase/en.json";
import enDashboard      from "./dashboard/en.json";
import enEvents         from "./events/en.json";

declare module "i18next" {
    interface CustomTypeOptions {
        defaultNS: "auth";
        resources: {
            auth:            (typeof enAuth)["auth"];
            user_management: (typeof enUserManagement)["user_management"];
            layout:          (typeof enLayout)["layout"];
            camera:          (typeof enCamera)["camera"];
            usecase:         (typeof enUsecase)["usecase"];
            dashboard:       (typeof enDashboard)["dashboard"];
            events:          (typeof enEvents)["events"];
        };
    }
}
