/**
 * Custom type to represent the potential error/success state of a command.
 * @field ok True if command was successful, False if not.
 * @field result The result message of the command.  Null if command was unsuccessful.
 * @field error The error message of the command.  Null if command was successful.
 */
export type CommandResult = {
	ok: boolean,
	result: string | null,
	error: string | null,
};