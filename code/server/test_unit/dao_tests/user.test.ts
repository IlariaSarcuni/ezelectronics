import { describe, test, expect, beforeEach, jest } from "@jest/globals"

import UserController from "../../src/controllers/userController"
import UserDAO from "../../src/dao/userDAO"
import crypto from "crypto"
import db from "../../src/db/db"
import { Database } from "sqlite3"
import {User, Role} from "../../src/components/user"
import {UserNotFoundError, UserIsAdminError} from "../../src/errors/userError"
import { DateError } from "../../src/utilities";

jest.mock("crypto")
jest.mock("../../src/db/db.ts")





test("It should resolve true", async () => {
    const userDAO = new UserDAO()
    const mockDBRun = jest.spyOn(db, "run").mockImplementation((sql, params, callback) => {
        callback(null)
        return {} as Database
    });
    const mockRandomBytes = jest.spyOn(crypto, "randomBytes").mockImplementation((size) => {
        return (Buffer.from("salt"))
    })
    const mockScrypt = jest.spyOn(crypto, "scrypt").mockImplementation(async (password, salt, keylen) => {
        return Buffer.from("hashedPassword")
    })
    const result = await userDAO.createUser("username", "name", "surname", "password", "role")
    expect(result).toBe(true)
    mockRandomBytes.mockRestore()
    mockDBRun.mockRestore()
    mockScrypt.mockRestore()


})



describe("getUserByUsername tests", () => {
    const userDAO = new UserDAO();

    test("should resolve with user data if user exists", async () => {
        const mockUser = { username: "testUser", name: "Test", surname: "User", role: "Customer" };
        jest.spyOn(db, "get").mockImplementation((sql, params, callback) => {
            callback(null, mockUser);
            return {} as Database
        });

        await expect(userDAO.getUserByUsername("testUser")).resolves.toEqual(mockUser);
    });

    test("should reject with UserNotFoundError if user does not exist", async () => {
        jest.spyOn(db, "get").mockImplementation((sql, params, callback) => {
            callback(null, undefined);
            return {} as Database
        });

        await expect(userDAO.getUserByUsername("nonExistentUser")).rejects.toThrow(UserNotFoundError);
    });

});


describe("getAllUsers tests", () => {
    const userDAO = new UserDAO();

    test("should resolve with all user data if users exist", async () => {
        const mockUsers = [
            { username: "user1", name: "Name1", surname: "Surname1", role: "Customer" },
            { username: "user2", name: "Name2", surname: "Surname2", role: "Admin" }
        ];
        jest.spyOn(db, "all").mockImplementation((sql, params, callback) => {
            callback(null, mockUsers);
            return {} as Database
        });

        await expect(userDAO.getAllUsers()).resolves.toEqual(mockUsers);
    });

    test("should resolve with an empty array if no users exist", async () => {
        jest.spyOn(db, "all").mockImplementation((sql, params, callback) => {
            callback(null, []);
            return {} as Database
        });

        await expect(userDAO.getAllUsers()).resolves.toEqual([]);
    });

});


describe("getUsersByRole tests", () => {
    const userDAO = new UserDAO();

    test("should resolve with all user data if users with specific role exist", async () => {
        const mockUsers = [
            { username: "user1", name: "Name1", surname: "Surname1", role: "Customer" },
            { username: "user2", name: "Name2", surname: "Surname2", role: "Customer" }
        ];
        jest.spyOn(db, "all").mockImplementation((sql, params, callback) => {
            callback(null, mockUsers);
            return {} as Database
        });

        await expect(userDAO.getUsersByRole("Customer")).resolves.toEqual(mockUsers);
    });

    test("should resolve with an empty array if no users with the specified role exist", async () => {
        jest.spyOn(db, "all").mockImplementation((sql, params, callback) => {
            callback(null, []);
            return {} as Database
        });

        await expect(userDAO.getUsersByRole("Manager")).resolves.toEqual([]);
    });

});


jest.mock("../../src/db/db.ts");

describe("deleteUser tests", () => {
    const userDAO = new UserDAO();

    test("should resolve true if user is successfully deleted", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { role: "Customer" });
            return {} as Database
        });
        jest.spyOn(db, "run").mockImplementationOnce((sql, params, callback) => {
            callback(null);
            return {} as Database
        });

        await expect(userDAO.deleteUser("user1")).resolves.toBe(true);
    });

    test("should reject with UserNotFoundError if user does not exist", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, undefined);
            return {} as Database
        });

        await expect(userDAO.deleteUser("nonExistentUser")).rejects.toThrow(UserNotFoundError);
    });

    test("should reject with UserIsAdminError if user is an admin", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { role: "Admin" });
            return {} as Database
        });

        await expect(userDAO.deleteUser("adminUser")).rejects.toThrow(UserIsAdminError);
    });

 

});


describe("deleteAllNonAdminUsers tests", () => {
    const userDAO = new UserDAO();

    test("should resolve true if all non-admin users are successfully deleted", async () => {
        jest.spyOn(db, "run").mockImplementation((sql, callback) => {
            callback(null);
            return {} as Database
        }); 

        await expect(userDAO.deleteAllNonAdminUsers()).resolves.toBe(true);
    });

});

describe("updateUserInfo tests", () => {
    const userDAO = new UserDAO();
    const validUser = {
        username: "testUser",
        name: "UpdatedName",
        surname: "UpdatedSurname",
        address: "UpdatedAddress",
        birthdate: "1990-01-01",
        role: "Customer"
    };

    test("should resolve with updated user data if update is successful", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, { role: "Customer" });
            return {} as Database
        });
        jest.spyOn(db, "run").mockImplementationOnce((sql, params, callback) => {
            callback(null, null);
            return {} as Database
        });

        await expect(userDAO.updateUserInfo("testUser", "UpdatedName", "UpdatedSurname", "UpdatedAddress", "1990-01-01")).resolves.toEqual(new User("testUser", "UpdatedName", "UpdatedSurname", Role.CUSTOMER, "UpdatedAddress", "1990-01-01"));
    });

    test("should reject with UserNotFoundError if user does not exist", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            callback(null, undefined);
            return {} as Database
        });

        await expect(userDAO.updateUserInfo("nonExistentUser", "Name", "Surname", "Address", "1990-01-01")).rejects.toThrow(UserNotFoundError);
    });

    test("should reject with DateError if birthdate is invalid (future date)", async () => {
        jest.spyOn(db, "get").mockImplementationOnce((sql, params, callback) => {
            
            callback(null, { username: "testUser", role: "Customer" });
            return {} as Database
        }); 
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1); 

        await expect(userDAO.updateUserInfo("testUser", "Name", "Surname", "Address", futureDate.toISOString().slice(0, 10))).rejects.toThrow(DateError);
    });




});

describe("getIsUserAuthenticated tests", () => {
    const userDAO = new UserDAO();

    test("should resolve to true if user is authenticated", async () => {
        const mockUser = { username: "testUser", password: "hashedPassword", salt: "salt" };
        jest.spyOn(db, "get").mockImplementation((sql, params, callback) => {
            callback(null, mockUser);
            return {} as Database;
        });
        jest.spyOn(crypto, "scryptSync").mockReturnValue(Buffer.from("hashedPassword"));
        jest.spyOn(crypto, "timingSafeEqual").mockReturnValue(true);

        await expect(userDAO.getIsUserAuthenticated("testUser", "plainPassword")).resolves.toBe(true);
    });

    test("should resolve to false if user does not exist", async () => {
        jest.spyOn(db, "get").mockImplementation((sql, params, callback) => {
            callback(null, null);
            return {} as Database;
        });

        await expect(userDAO.getIsUserAuthenticated("testUser", "plainPassword")).resolves.toBe(false);
    });

    test("should resolve to false if password is incorrect", async () => {
        const mockUser = { username: "testUser", password: "hashedPassword", salt: "salt" };
        jest.spyOn(db, "get").mockImplementation((sql, params, callback) => {
            callback(null, mockUser);
            return {} as Database;
        });
        jest.spyOn(crypto, "scryptSync").mockReturnValue(Buffer.from("wrongHashedPassword"));
        jest.spyOn(crypto, "timingSafeEqual").mockReturnValue(false);

        await expect(userDAO.getIsUserAuthenticated("testUser", "plainPassword")).resolves.toBe(false);
    });

    test("should reject if there is a database error", async () => {
        jest.spyOn(db, "get").mockImplementation((sql, params, callback) => {
            callback(new Error("Database error"), null);
            return {} as Database;
        });

        await expect(userDAO.getIsUserAuthenticated("testUser", "plainPassword")).rejects.toThrow("Database error");
    });

    test("should reject if there is an unexpected error", async () => {
        jest.spyOn(db, "get").mockImplementation(() => {
            throw new Error("Unexpected error");
        });

        await expect(userDAO.getIsUserAuthenticated("testUser", "plainPassword")).rejects.toThrow("Unexpected error");
    });
});