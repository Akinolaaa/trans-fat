interface HttpErrorPayload {
	message?: string;
	[key: string]: unknown;
}

export class HttpException extends Error {
	public readonly statusCode: number;
	public readonly payload?: HttpErrorPayload;

	constructor(messageOrObject: string | HttpErrorPayload, statusCode = 500) {
		const message =
			typeof messageOrObject === "string"
				? messageOrObject
				: messageOrObject.message ?? "An error has occurred";

		super(message);

		this.statusCode = statusCode;

		if (typeof messageOrObject === "object") {
			this.payload = messageOrObject;
		}

		Object.setPrototypeOf(this, HttpException.prototype);


		this.name = this.constructor.name;
	}
}
