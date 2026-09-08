export function Badge({ nivel }: { nivel: string }) {
  const cls =
    nivel === 'verde' || nivel === 'Bajo'
      ? 'badge-verde'
      : nivel === 'naranja' || nivel === 'Medio'
        ? 'badge-naranja'
        : nivel === 'rojo' || nivel === 'Alto'
          ? 'badge-rojo'
          : 'badge-gris';

  return <span className={`badge ${cls}`}>{nivel.toUpperCase() || 'N/D'}</span>;
}
