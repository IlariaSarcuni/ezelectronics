import { test, expect, jest, describe, beforeEach } from "@jest/globals"
import UserController from "../../src/controllers/userController"
import UserDAO from "../../src/dao/userDAO"
import { Role } from "../../src/components/user"
import { UnauthorizedUserError, UserIsAdminError, UserNotFoundError } from "../../src/errors/userError"
import { User } from "../../src/components/user"
import { CustomError } from "../../src/utilities"

jest.mock("../../src/dao/userDAO")




beforeEach(() => {
    jest.clearAllMocks(); 
  });


test("It should return true", async () => {
    const testUser = { 
        username: "test",
        name: "test",
        surname: "test",
        password: "test",
        role: "Manager"
    }
    jest.spyOn(UserDAO.prototype, "createUser").mockResolvedValueOnce(true); 
    const controller = new UserController(); 
    
    const response = await controller.createUser(testUser.username, testUser.name, testUser.surname, testUser.password, testUser.role);

    
    expect(UserDAO.prototype.createUser).toHaveBeenCalledTimes(1);
    expect(UserDAO.prototype.createUser).toHaveBeenCalledWith(testUser.username,
        testUser.name,
        testUser.surname,
        testUser.password,
        testUser.role);
    expect(response).toBe(true); 
});


test("It should retrieve all users", async () => {
    const mockUsers = [
        { username: "user1", name: "Name1", surname: "Surname1", role: Role.MANAGER, address: "Address1", birthdate: "2000-01-01" },
        { username: "user2", name: "Name2", surname: "Surname2", role: Role.CUSTOMER, address: "Address2", birthdate: "2000-01-01" }
    ];

    
    jest.spyOn(UserDAO.prototype, "getAllUsers").mockResolvedValue(mockUsers);

    const controller = new UserController();

    
    const users = await controller.getUsers();

    
    expect(UserDAO.prototype.getAllUsers).toHaveBeenCalledTimes(1);

    
    expect(users).toEqual(mockUsers);
});

describe("getUserByUsername", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should allow Admin to retrieve any user", async () => {
        const adminUser = new User("adminUser", "Admin", "User", Role.ADMIN, "AdminAddress", "1970-01-01");
        const targetUsername = "targetUser";
        const mockUser = new User(targetUsername, "Target", "User", Role.CUSTOMER, "TargetAddress", "1990-01-01");

        jest.spyOn(UserDAO.prototype, "getUserByUsername").mockResolvedValue(mockUser);
        const controller = new UserController();

        const user = await controller.getUserByUsername(adminUser, targetUsername);

        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledWith(targetUsername);
        expect(user).toEqual(mockUser);
    });

    test("should allow non-Admin to retrieve only their own information", async () => {
        const normalUser = new User("normalUser", "Normal", "User", Role.CUSTOMER, "NormalAddress", "1985-01-01");
        const mockUser = new User("normalUser", "Normal", "User", Role.CUSTOMER, "NormalAddress", "1985-01-01");

        jest.spyOn(UserDAO.prototype, "getUserByUsername").mockResolvedValue(mockUser);
        const controller = new UserController();

        const user = await controller.getUserByUsername(normalUser, normalUser.username);

        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.getUserByUsername).toHaveBeenCalledWith(normalUser.username);
        expect(user).toEqual(mockUser);
    });

    test("should throw UnauthorizedUserError if non-Admin tries to access another user's data", async () => {
        const normalUser = new User("normalUser", "Normal", "User", Role.CUSTOMER, "NormalAddress", "1985-01-01");
        const targetUsername = "otherUser";

        const controller = new UserController();

        await expect(controller.getUserByUsername(normalUser, targetUsername))
            .rejects.toThrow(UnauthorizedUserError);
    });

    test("should throw UserNotFoundError if the user does not exist", async () => {
        const adminUser = new User("adminUser", "Admin", "User", Role.ADMIN, "AdminAddress", "1970-01-01");
        const nonExistentUsername = "nonExistentUser";

        jest.spyOn(UserDAO.prototype, "getUserByUsername").mockRejectedValue(new UserNotFoundError());
        const controller = new UserController();

        await expect(controller.getUserByUsername(adminUser, nonExistentUsername))
            .rejects.toThrow(UserNotFoundError);
    });
});


describe("deleteUser", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should allow a user to delete their own account", async () => {
        const normalUser = new User("normalUser", "Normal", "User", Role.CUSTOMER, "NormalAddress", "1985-01-01");
        jest.spyOn(UserDAO.prototype, "deleteUser").mockResolvedValue(true);

        const controller = new UserController();
        const result = await controller.deleteUser(normalUser, normalUser.username);

        expect(UserDAO.prototype.deleteUser).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.deleteUser).toHaveBeenCalledWith(normalUser.username);
        expect(result).toBe(true); 
    });

    test("should allow Admin to delete a non-Admin user", async () => {
        const adminUser = new User("adminUser", "Admin", "User", Role.ADMIN, "AdminAddress", "1970-01-01");
        const targetUsername = "normalUser";
        jest.spyOn(UserDAO.prototype, "deleteUser").mockResolvedValue(true);

        const controller = new UserController();
        const result = await controller.deleteUser(adminUser, targetUsername);

        expect(UserDAO.prototype.deleteUser).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.deleteUser).toHaveBeenCalledWith(targetUsername);
        expect(result).toBe(true); 
    });

    test("should throw UnauthorizedUserError if non-Admin tries to delete another user", async () => {
        const normalUser = new User("normalUser", "Normal", "User", Role.CUSTOMER, "NormalAddress", "1985-01-01");
        const targetUsername = "otherUser";

        const controller = new UserController();
        await expect(controller.deleteUser(normalUser, targetUsername))
            .rejects.toThrow(UnauthorizedUserError);
    });

    test("should throw UnauthorizedUserError if Admin tries to delete another Admin", async () => {
        const adminUser = new User("adminUser", "Admin", "User", Role.ADMIN, "AdminAddress", "1970-01-01");
        const otherAdminUsername = "otherAdmin";

        jest.spyOn(UserDAO.prototype, "deleteUser").mockImplementation(() => {
            throw new UserIsAdminError();
        });

        const controller = new UserController();

        await expect(controller.deleteUser(adminUser, otherAdminUsername))
            .rejects.toThrow(UserIsAdminError);
    });
});

describe("deleteAll", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should delete all non-Admin users", async () => {
        jest.spyOn(UserDAO.prototype, "deleteAllNonAdminUsers").mockResolvedValue(true);

        const controller = new UserController();
        const result = await controller.deleteAll();

        expect(UserDAO.prototype.deleteAllNonAdminUsers).toHaveBeenCalledTimes(1);
        expect(result).toBe(true); 
    });

});


describe("updateUserInfo", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should allow Admin to update any user's information", async () => {
        const adminUser = new User("adminUser", "Admin", "User", Role.ADMIN, "AdminAddress", "1970-01-01");
        const updateData = { name: "NewName", surname: "NewSurname", address: "NewAddress", birthdate: "1990-01-01" };
        const targetUsername = "targetUser";

        jest.spyOn(UserDAO.prototype, "updateUserInfo").mockResolvedValue(new User(targetUsername, updateData.name, updateData.surname, Role.CUSTOMER, updateData.address, updateData.birthdate));

        const controller = new UserController();
        await controller.updateUserInfo(adminUser, updateData.name, updateData.surname, updateData.address, updateData.birthdate, targetUsername);
        expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledWith(targetUsername, updateData.name, updateData.surname, updateData.address, updateData.birthdate);
    });

    test("should allow user to update their own information", async () => {
        const normalUser = new User("normalUser", "Normal", "User", Role.CUSTOMER, "NormalAddress", "1985-01-01");
        const updateData = { name: "UpdatedName", surname: "UpdatedSurname", address: "UpdatedAddress", birthdate: "1985-01-02" };

        jest.spyOn(UserDAO.prototype, "updateUserInfo").mockResolvedValue(new User(normalUser.username, updateData.name, updateData.surname, Role.CUSTOMER, updateData.address, updateData.birthdate));

        const controller = new UserController();
        await controller.updateUserInfo(normalUser, updateData.name, updateData.surname, updateData.address, updateData.birthdate, normalUser.username);
        expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.updateUserInfo).toHaveBeenCalledWith(normalUser.username, updateData.name, updateData.surname, updateData.address, updateData.birthdate);
    });

    test("should throw UnauthorizedUserError if non-Admin tries to update another user's information", async () => {
        const normalUser = new User("normalUser", "Normal", "User", Role.CUSTOMER, "NormalAddress", "1985-01-01");
        const targetUsername = "otherUser";
        const updateData = { name: "OtherName", surname: "OtherSurname", address: "OtherAddress", birthdate: "1990-01-01" };

        const controller = new UserController();

        await expect(controller.updateUserInfo(normalUser, updateData.name, updateData.surname, updateData.address, updateData.birthdate, targetUsername))
            .rejects.toThrow(UnauthorizedUserError);
    });

});

describe("getUsersByRole", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should return users for a valid role", async () => {
        const role = "Customer";
        const mockUsers = [
            new User("user1", "Name1", "Surname1", Role.CUSTOMER, "Address1", "2000-01-01"),
            new User("user2", "Name2", "Surname2", Role.CUSTOMER, "Address2", "2000-01-02")
        ];

        jest.spyOn(UserDAO.prototype, "getUsersByRole").mockResolvedValue(mockUsers);
        const controller = new UserController();

        const users = await controller.getUsersByRole(Role.CUSTOMER);

        expect(UserDAO.prototype.getUsersByRole).toHaveBeenCalledTimes(1);
        expect(UserDAO.prototype.getUsersByRole).toHaveBeenCalledWith(role);
        expect(users).toEqual(mockUsers);
    });

    test("should throw an error for an invalid role", async () => {
        const invalidRole = "InvalidRole";

        const controller = new UserController();

        await expect(controller.getUsersByRole(invalidRole))
            .rejects.toThrow(CustomError);
    });

    test("should throw UserNotFoundError if no users found for the role", async () => {
        const role = "Admin";

        jest.spyOn(UserDAO.prototype, "getUsersByRole").mockRejectedValue(new UserNotFoundError());
        const controller = new UserController();

        await expect(controller.getUsersByRole(role))
            .rejects.toThrow(UserNotFoundError);
    });
});