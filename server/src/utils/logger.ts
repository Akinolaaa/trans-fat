import winston from "winston";

const { combine, timestamp, printf, colorize } = winston.format;

const logFormat = printf(({ level, message, timestamp, context }) => {
	return `${timestamp} [${level}]${context ? ` [${context}]` : ""}: ${message}`;
});

export class Logger {
	private context?: string;
	private logger: winston.Logger;

	constructor(context?: string) {
		this.context = context || "";

		this.logger = winston.createLogger({
			level: "info",
			format: combine(
				colorize(),
				timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
				winston.format((info) => {
					info.context = this.context;
					return info;
				})(),
				logFormat
			),
			transports: [
				new winston.transports.Console(),
				// You can add a File transport too if needed
			],
		});
	}

	info(message: string) {
		this.logger.info(message);
	}

	warn(message: string) {
		this.logger.warn(message);
	}

	error(message: string, trace?: string | object) {
		let traceString = "";

		if (trace) {
			try {
				traceString = typeof trace === "string" ? trace : JSON.stringify(trace);
			} catch {
				traceString =
					trace instanceof Error ? trace.stack || trace.message : String(trace);
			}
		}

		this.logger.error(`${message}${traceString ? ` - ${traceString}` : ""}`);
	}
}
