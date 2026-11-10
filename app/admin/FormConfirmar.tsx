"use client";

/** Formulário de ação do servidor que pede confirmação antes de enviar (quando há mensagem). */
export default function FormConfirmar({
  action,
  mensagem,
  children,
}: {
  action: (form: FormData) => void | Promise<void>;
  mensagem?: string | null;
  children: React.ReactNode;
}) {
  return (
    <form action={action} onSubmit={(e) => { if (mensagem && !confirm(mensagem)) e.preventDefault(); }}>
      {children}
    </form>
  );
}
