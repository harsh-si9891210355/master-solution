export interface UserList {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    mobile_number: string;
    role_code: string;
    role_name: string;
    is_active: boolean;
    status: boolean;
}

export interface AddUserValues {
    email?: string;          
    password?: string;        
    first_name: string;
    last_name: string;
    mobile_number: string;
    role_code: string;
    is_active?: boolean;
    status?: boolean;
}