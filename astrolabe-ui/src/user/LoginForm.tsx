import { Textfield } from "../Textfield";
import { Control, Fcheckbox, useControlEffect } from "@react-typed-forms/core";
import { Button } from "../Button";
import clsx from "clsx";
import { LoginFormData, useAuthPageSetup } from "@astroapps/client";
import { CircularProgress } from "../CircularProgress";
import { UserFormContainer } from "./UserFormContainer";

export function LoginForm({
	className,
	control,
	authenticate,
}: {
	className?: string;
	control: Control<LoginFormData>;
	authenticate: () => Promise<boolean>;
}) {
	const {
		hrefs: { signup, resetPassword },
	} = useAuthPageSetup();

	const {
		fields: { password, username, rememberMe },
		disabled,
	} = control;
	const { error } = control;
	useControlEffect(
		() => [username.value, password.value],
		() => (control.error = null),
	);
	const linkStyle =
		"font-medium text-primary-600 hover:underline dark:text-primary-500";
	return (
		<UserFormContainer className={className}>
			<h2>Login</h2>
			<form
				className="my-2 space-y-4"
				onSubmit={(e) => {
					e.preventDefault();
					authenticate();
				}}
			>
				<div className="flex">
					<div>Do you have an account yet?</div>
					<a className={clsx("ml-1 ", linkStyle)} href={signup}>
						Signup
					</a>
				</div>
				<Textfield
					control={username}
					label="Username"
					autoComplete="username"
				/>
				<Textfield
					control={password}
					label="Password"
					type="password"
					autoComplete="current-password"
				/>
				<div className="flex justify-between text-sm">
					<div>
						<Fcheckbox control={rememberMe} /> <label>Remember me</label>
					</div>
					<div>
						<a href={resetPassword} className={linkStyle}>
							Forgot your password?
						</a>
					</div>
				</div>
				{error && <p className="text-danger">{error}</p>}
				{disabled && <CircularProgress />}
				<Button className="w-full" type="submit" disabled={disabled}>
					Login
				</Button>
			</form>
		</UserFormContainer>
	);
}
