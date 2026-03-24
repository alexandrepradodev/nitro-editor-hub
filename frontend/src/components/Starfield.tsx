type StarfieldProps = {
  /** Quando true, preenche o pai posicionado (ex.: login-shell) em vez de fixed na viewport */
  anchored?: boolean;
};

export default function Starfield({ anchored = false }: StarfieldProps) {
  const cls = anchored ? "starfield starfield--anchored" : "starfield";
  return (
    <div className={cls} aria-hidden="true">
      <span className="shooting-star shooting-star--a" />
      <span className="shooting-star shooting-star--b" />
      <span className="shooting-star shooting-star--c" />
    </div>
  );
}
