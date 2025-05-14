import { test, expect, jest, describe, beforeEach } from "@jest/globals"
import request from 'supertest'
import { app } from "../../index"
import AuthService from "../../src/routers/auth"
import UserController from "../../src/controllers/userController"
const baseURL = "/ezelectronics"
import { User, Role } from "../../src/components/user"
import {UnauthorizedUserError, UserNotFoundError, UserIsAdminError, BadRequestError} from "../../src/errors/userError"







jest.mock('../../src/controllers/userController');
jest.mock('../../src/routers/auth');


test("It should return a 200 success code", async () => {
    const testUser = { 
        username: "test",
        name: "test",
        surname: "test",
        password: "test",
        role: "Manager"
    }
    jest.spyOn(UserController.prototype, "createUser").mockResolvedValueOnce(true) 
    const response = await request(app).post(baseURL + "/users").send(testUser) 
    expect(response.status).toBe(200) 
    expect(UserController.prototype.createUser).toHaveBeenCalledTimes(1) 
    
    expect(UserController.prototype.createUser).toHaveBeenCalledWith(testUser.username,
        testUser.name,
        testUser.surname,
        testUser.password,
        testUser.role)
})


describe("GET /users - Retrieving all users", () => {
    
    const users = [
        { username: "user1", name: "Name1", surname: "Surname1", role: Role.ADMIN, address: "123456789", birthdate: "12/12/2000" },
        { username: "user2", name: "Name2", surname: "Surname2", role: Role.MANAGER, address: "123456789", birthdate: "12/12/2000" }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should return all users with a 200 status code for admin users", async () => {
        
        jest.spyOn(AuthService.prototype, "isAdmin").mockImplementation((req, res, next) => next());
        jest.spyOn(UserController.prototype, "getUsers").mockResolvedValue(users);

        const response = await request(app).get(baseURL + "/users");
        expect(response.status).toBe(200);
        expect(UserController.prototype.getUsers).toHaveBeenCalledTimes(1);
    });

    test("should return 401 unauthorized when a non-admin user tries to access", async () => {
        
        jest.spyOn(AuthService.prototype, "isAdmin").mockImplementation((req, res, next) => {
            res.status(401).json({ error: "User is not an admin" });
        });

        const response = await request(app).get(baseURL + "/users");
        expect(response.status).toBe(401);
        expect(UserController.prototype.getUsers).not.toHaveBeenCalled();
    });

});

describe("GET /users/roles/:role - Retrieving users by role", () => {
    const roles = [Role.MANAGER, Role.CUSTOMER, Role.ADMIN];
    const invalidRole = "NonExistentRole";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    roles.forEach(role => {
        test(`should return all ${role} users with a 200 status code`, async () => {
            const mockUsers = [
                { username: "user1", name: "Name1", surname: "Surname1", role: role, address: "123456789", birthdate: "12/12/2000" }
            ];
            jest.spyOn(AuthService.prototype, "isAdmin").mockImplementation((req, res, next) => next());
            jest.spyOn(UserController.prototype, "getUsersByRole").mockResolvedValue(mockUsers);

            const response = await request(app).get(`${baseURL}/users/roles/${role}`);
            expect(response.status).toBe(200);
            expect(UserController.prototype.getUsersByRole).toHaveBeenCalledWith(role);
            expect(AuthService.prototype.isAdmin).toHaveBeenCalled();
        });
    });

    test("should return 422 bad request for an invalid role", async () => {
    jest.spyOn(AuthService.prototype, "isAdmin").mockImplementation((req, res, next) => next());
    jest.spyOn(UserController.prototype, "getUsersByRole").mockImplementation(() => {
        throw new Error("Invalid role");
    });

    const response = await request(app).get(`${baseURL}/users/roles/${invalidRole}`);
    expect(response.status).toBe(422);
    expect(AuthService.prototype.isAdmin).toHaveBeenCalled();
});

    test("should return 401 unauthorized when a non-admin user tries to access", async () => {
        jest.spyOn(AuthService.prototype, "isAdmin").mockImplementation((req, res, next) => {
            res.status(401).json({ error: "User is not an admin" });
        });

        const response = await request(app).get(`${baseURL}/users/roles/${roles[0]}`);
        expect(response.status).toBe(401);
        expect(AuthService.prototype.isAdmin).toHaveBeenCalled();
    });
});


describe("GET /users/:username - Retrieving user by username", () => {
    const adminUser = { username: "admin", role: Role.ADMIN };
    const normalUser = { username: "user1", role: Role.CUSTOMER, name: "Name1", surname: "Surname1", address: "123456789", birthdate: "12/12/2000" };
    const nonExistentUsername = "nonexistent";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Admin retrieving any user's data", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => {
            req.user = adminUser;
            next();
        });
        jest.spyOn(UserController.prototype, "getUserByUsername").mockResolvedValue(normalUser);

        const response = await request(app).get(`${baseURL}/users/${normalUser.username}`);
        expect(response.status).toBe(200);
    });

    test("Non-admin trying to retrieve another user's data", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => {
            req.user = normalUser;
            next();
        });
        jest.spyOn(UserController.prototype, "getUserByUsername").mockImplementation(() => {
            throw new UnauthorizedUserError();
        });

        const response = await request(app).get(`${baseURL}/users/${adminUser.username}`);
        expect(response.status).toBe(401);
    });

    test("User retrieving their own data", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => {
            req.user = normalUser;
            next();
        });
        jest.spyOn(UserController.prototype, "getUserByUsername").mockResolvedValue(normalUser);

        const response = await request(app).get(`${baseURL}/users/${normalUser.username}`);
        expect(response.status).toBe(200);
    });

    test("Retrieving a non-existent user", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => {
            req.user = adminUser;
            next();
        });
        jest.spyOn(UserController.prototype, "getUserByUsername").mockRejectedValue(new UserNotFoundError());

        const response = await request(app).get(`${baseURL}/users/${nonExistentUsername}`);
        expect(response.status).toBe(404);
    });
});

describe("DELETE /users/:username - Deleting user by username", () => {
    const adminUser = { username: "admin", role: "Admin" };
    const normalUser = { username: "user1", role: "Customer" };
    const anotherNormalUser = { username: "user2", role: "Customer" };
    const nonExistentUsername = "nonexistent";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Admin deleting a non-admin user", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => {
            req.user = adminUser;
            next();
        });
        jest.spyOn(UserController.prototype, "deleteUser").mockResolvedValue(true);

        const response = await request(app).delete(`${baseURL}/users/${normalUser.username}`);
        expect(response.status).toBe(200);
    });

    test("Admin attempting to delete another admin", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => {
            req.user = adminUser;
            next();
        });
        jest.spyOn(UserController.prototype, "deleteUser").mockRejectedValue(new UserIsAdminError());

        const response = await request(app).delete(`${baseURL}/users/${adminUser.username}`);
        expect(response.status).toBe(401);
    });

    test("Non-admin deleting their own account", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => {
            req.user = normalUser;
            next();
        });
        jest.spyOn(UserController.prototype, "deleteUser").mockResolvedValue(true);

        const response = await request(app).delete(`${baseURL}/users/${normalUser.username}`);
        expect(response.status).toBe(200);
    });

    test("Non-admin attempting to delete another user's account", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => {
            req.user = normalUser;
            next();
        });
        jest.spyOn(UserController.prototype, "deleteUser").mockRejectedValue(new UnauthorizedUserError());

        const response = await request(app).delete(`${baseURL}/users/${anotherNormalUser.username}`);
        expect(response.status).toBe(401);
    });

    test("Deleting a non-existent user", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => {
            req.user = adminUser;
            next();
        });
        jest.spyOn(UserController.prototype, "deleteUser").mockRejectedValue(new UserNotFoundError());

        const response = await request(app).delete(`${baseURL}/users/${nonExistentUsername}`);
        expect(response.status).toBe(404);
    });
});

describe("DELETE /users - Deleting all non-Admin users", () => {
    const adminUser = { username: "admin", role: "Admin" };
    const nonAdminUser = { username: "user1", role: "Customer" };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Admin successfully deletes all non-Admin users", async () => {
        jest.spyOn(AuthService.prototype, "isAdmin").mockImplementation((req, res, next) => {
            req.user = adminUser;
            next();
        });
        jest.spyOn(UserController.prototype, "deleteAll").mockResolvedValue(true);

        const response = await request(app).delete(`${baseURL}/users`);
        expect(response.status).toBe(200);
    });

    test("Non-admin user attempting to delete all users", async () => {
        jest.spyOn(AuthService.prototype, "isAdmin").mockImplementation((req, res, next) => {
            res.status(403).json({ error: "User is not authorized" });
        });

        const response = await request(app).delete(`${baseURL}/users`);
        expect(response.status).toBe(403);
    });

});

describe("PATCH /users/:username - Updating user information", () => {
    const adminUser = { username: "admin", role: Role.ADMIN };
    const normalUser = { username: "user1", role: Role.CUSTOMER };
    const updateData = { name: "NewName", surname: "NewSurname", address: "NewAddress", birthdate: "2001-01-01" };
    const futureDateData = { ...updateData, birthdate: "3000-01-01" };
    const nonExistentUsername = "nonexistent";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("Admin updating any user's information", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => {
            req.user = adminUser;
            next();
        });
        jest.spyOn(UserController.prototype, "updateUserInfo").mockResolvedValue({ ...normalUser, ...updateData });

        const response = await request(app).patch(`${baseURL}/users/${normalUser.username}`).send(updateData);
        expect(response.status).toBe(200);
    });

    test("User updating their own information", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => {
            req.user = normalUser;
            next();
        });
        jest.spyOn(UserController.prototype, "updateUserInfo").mockResolvedValue({ ...normalUser, ...updateData });

        const response = await request(app).patch(`${baseURL}/users/${normalUser.username}`).send(updateData);
        expect(response.status).toBe(200);
    });

    test("User attempting to update another user's information", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => {
            req.user = normalUser;
            next();
        });
        jest.spyOn(UserController.prototype, "updateUserInfo").mockRejectedValue(new UnauthorizedUserError());

        const response = await request(app).patch(`${baseURL}/users/${adminUser.username}`).send(updateData);
        expect(response.status).toBe(401);
    });

    test("Updating with invalid data (future birthdate)", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => {
            req.user = normalUser;
            next();
        });
        jest.spyOn(UserController.prototype, "updateUserInfo").mockRejectedValue(new BadRequestError());

        const response = await request(app).patch(`${baseURL}/users/${normalUser.username}`).send(futureDateData);
        expect(response.status).toBe(400);
    });

    test("Attempting to update a non-existent user", async () => {
        jest.spyOn(AuthService.prototype, "isLoggedIn").mockImplementation((req, res, next) => {
            req.user = adminUser;
            next();
        });
        jest.spyOn(UserController.prototype, "updateUserInfo").mockRejectedValue(new UserNotFoundError());

        const response = await request(app).patch(`${baseURL}/users/${nonExistentUsername}`).send(updateData);
        expect(response.status).toBe(404);
    });
});