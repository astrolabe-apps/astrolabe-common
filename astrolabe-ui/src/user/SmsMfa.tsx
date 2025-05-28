import { Button } from "../Button";
import { Textfield } from "../Textfield";
import React from "react";
import {
	Control,
	Fcheckbox,
	useComputed,
	useControl,
	useControlEffect,
} from "@react-typed-forms/core";
import { MfaFormData, useAuthPageSetup } from "@astroapps/client";

type SmsMfaProps = {
	control: Control<MfaFormData>;
	sendCode: () => Promise<any>;
	verifyCode: () => Promise<any>;
};

export default function SmsMfa({ control, sendCode, verifyCode }: SmsMfaProps) {
	const {
		errors: { codeLimit },
	} = useAuthPageSetup();

	const {
		fields: { code, token, updateNumber, number },
		error,
	} = control;

	// Mobile number
	const mobileNumber = useComputed(() => {
		const tokenPayload = JSON.parse(atob(token.value.split(".")[1]));
		if (tokenPayload.mn) {
			return tokenPayload.mn as string;
		}
		return null;
	});

	// Backup number in some instances...
	const contactNumber = useComputed(() => {
		const tokenPayload = JSON.parse(atob(token.value.split(".")[1]));
		if (tokenPayload.cn) {
			return tokenPayload.cn as string;
		}
		return null;
	});

	useControlEffect(
		() => updateNumber.value,
		(v) => {
			if (!v) {
				number.value = null;
				number.error = null;
			}
		},
	);

	useControlEffect(
		() => code.value,
		() => {
			if (control.error != codeLimit) control.error = null;
		},
	);
	const codeSent = useControl(false);

	return (
		<>
			{codeSent.value ? (
				<div className="flex flex-col gap-3">
					<div>
						<p>
							We sent a code to XXXX XXX{" "}
							{mobileNumber.value?.slice(-3) ?? number.value?.slice(-3)}
						</p>
						<Textfield control={code} label="Code" />
						{error && <p className="text-danger">{error}</p>}
					</div>
					<Button
						type="button"
						onClick={verifyCode}
						disabled={
							!code.value ||
							code.value.length != 6 ||
							control.error === codeLimit
						}
					>
						Verify code
					</Button>
					<p>
						Haven't got an SMS from us?{" "}
						<button
							className="underline"
							onClick={sendCode}
							disabled={control.error === codeLimit}
						>
							Resend the code
						</button>
					</p>
				</div>
			) : (
				<>
					<p>
						We have the following mobile number XXXX XXX{" "}
						{mobileNumber.value?.slice(-3) ?? contactNumber.value?.slice(-3)}
					</p>
					{contactNumber.value && (
						<div>
							<div className="flex flex-row gap-2 items-center">
								<Fcheckbox id="updateNumber" control={updateNumber} />
								<label htmlFor="updateNumber">Send to a different number</label>
							</div>
						</div>
					)}
					{updateNumber.value && (
						<>
							<Textfield
								control={number}
								label={"Mobile Number"}
								readOnly={codeSent.value}
							/>
						</>
					)}
					{error && <p className="text-danger">{error}</p>}
					<Button
						type="button"
						onClick={async () => {
							if (await sendCode()) codeSent.value = true;
						}}
					>
						Send Code
					</Button>
				</>
			)}
		</>
	);
}
