export abstract class Exception extends Error {
    type: Function;
    constructor(message: string, type: Function) {
        super(message);
        this.type = type;
    }
}

export class ValidationException extends Exception {
    constructor(message: string) {
        super(message, ValidationException);
    }
}

export class BlockedAccountException extends Exception {
    constructor(message: string) {
        super(message, BlockedAccountException);
    }
}

export class InvalidAccountException extends Exception {
    constructor(message: string) {
        super(message, InvalidAccountException);
    }
}