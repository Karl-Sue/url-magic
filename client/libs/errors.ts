export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class NetworkError extends Error {
  constructor(message = "Unable to connect to the server — the API appears to be down.") {
    super(message);
    this.name = "NetworkError";
  }
}
