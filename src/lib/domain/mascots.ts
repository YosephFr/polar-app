export const mascots = [
  { id: "polar-bear", name: "Oso polar", days: 0, src: "/mascots/polar-bear.svg", color: "#218684" },
  { id: "arctic-fox", name: "Zorro ártico", days: 3, src: "/mascots/arctic-fox.svg", color: "#de6a49" },
  { id: "penguin", name: "Pingüino", days: 7, src: "/mascots/penguin.svg", color: "#75a6d2" },
  { id: "seal", name: "Foca valiente", days: 10, src: "/mascots/seal.svg", color: "#7ca78f" },
  { id: "snowy-owl", name: "Búho nival", days: 14, src: "/mascots/snowy-owl.svg", color: "#394b56" },
  { id: "arctic-wolf", name: "Lobo ártico", days: 18, src: "/mascots/arctic-wolf.svg", color: "#338a88" },
  { id: "white-tiger", name: "Tigre blanco", days: 21, src: "/mascots/white-tiger.svg", color: "#e7b642" },
  { id: "panda", name: "Panda zen", days: 25, src: "/mascots/panda.svg", color: "#7b9f7d" },
  { id: "unicorn", name: "Unicornio", days: 28, src: "/mascots/unicorn.svg", color: "#bd78b5" },
  { id: "dragon", name: "Dragón polar", days: 35, src: "/mascots/dragon.svg", color: "#304a52" },
] as const;

export type MascotId = (typeof mascots)[number]["id"];

export function mascotById(id: string) {
  return mascots.find((mascot) => mascot.id === id) || mascots[0];
}
