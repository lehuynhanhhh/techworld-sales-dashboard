/* Legend nằm TRÊN chart, căn trái. Chỉ màu ↔ tên nhóm — không số liệu.
   Chỉ dùng cho donut (two = 2 hàng, 44px) và line nhiều đường (1 hàng, 24px). */
export function Legend({ items, two = false }: {
  items: { name: string; color: string }[];
  two?: boolean;
}) {
  return (
    <div className={`lgd${two ? ' two' : ''}`}>
      {items.map((i) => (
        <span className="li" key={i.name}>
          <i style={{ background: i.color }} />
          <b>{i.name}</b>
        </span>
      ))}
    </div>
  );
}
