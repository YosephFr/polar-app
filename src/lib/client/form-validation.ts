export type FieldErrors = Record<string, string>;

export type ApiProblem = {
  error?: string;
  fieldErrors?: FieldErrors;
};

type ValidatableControl = HTMLInputElement | HTMLTextAreaElement;

function controlMessage(control: ValidatableControl) {
  const validity = control.validity;
  if (validity.valueMissing) return "Complete este campo.";
  if (validity.typeMismatch) return control.type === "email" ? "Ingrese un correo electrónico válido." : "Ingrese un valor válido.";
  if (validity.patternMismatch) return "Utilice un formato válido.";
  if (validity.tooShort) return `Use al menos ${control.minLength} caracteres.`;
  if (validity.tooLong) return `Use como máximo ${control.maxLength} caracteres.`;
  if (validity.rangeUnderflow) return `El valor mínimo es ${control instanceof HTMLInputElement ? control.min : "el indicado"}.`;
  if (validity.rangeOverflow) return `El valor máximo es ${control instanceof HTMLInputElement ? control.max : "el indicado"}.`;
  if (validity.stepMismatch) return "Ingrese un valor permitido.";
  if (validity.badInput) return "Ingrese un número válido.";
  return "Revise este campo.";
}

function namedControl(form: HTMLFormElement, name: string) {
  const control = form.elements.namedItem(name);
  if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) return control;
  return null;
}

export function validateForm(form: HTMLFormElement, names?: string[]) {
  const controls = names
    ? names.map((name) => namedControl(form, name)).filter((control): control is ValidatableControl => Boolean(control))
    : Array.from(form.elements).filter((control): control is ValidatableControl =>
      (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) && control.type !== "hidden",
    );
  const errors: FieldErrors = {};
  for (const control of controls) {
    if (control.disabled || control.validity.valid || !control.name) continue;
    errors[control.name] = controlMessage(control);
  }
  return errors;
}

export function focusFirstError(form: HTMLFormElement, errors: FieldErrors) {
  const name = Object.keys(errors)[0];
  if (!name) return;
  const control = form.elements.namedItem(name);
  if (control instanceof HTMLElement && !(control instanceof HTMLInputElement && control.type === "hidden")) {
    control.focus();
    return;
  }
  form.querySelector<HTMLElement>(`[data-field-name="${name}"]`)?.focus();
}

export function clearFieldError(errors: FieldErrors, name: string) {
  if (!errors[name]) return errors;
  const next = { ...errors };
  delete next[name];
  return next;
}
