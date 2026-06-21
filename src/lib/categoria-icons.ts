import {
  UtensilsCrossed, Pizza, Sandwich, IceCream, Cake, Croissant, Beef, Apple,
  ShoppingCart, ShoppingBag, Store, Wine, Beer, Coffee, Pill, PawPrint,
  Wrench, Car, Bike, Shirt, Footprints, Hammer, Smartphone, Laptop, Flower2,
  BookOpen, Gift, Scissors, Sparkles, Dumbbell, Gamepad2, Music, Camera,
  Baby, Home, Hospital, Stethoscope, GraduationCap, Briefcase, Package,
  Truck, Heart, Star, Tag, Leaf, Fish, Drumstick, Salad, Soup, CupSoda,
} from "lucide-react";

export const CATEGORIA_ICONS = {
  UtensilsCrossed, Pizza, Sandwich, IceCream, Cake, Croissant, Beef, Apple,
  ShoppingCart, ShoppingBag, Store, Wine, Beer, Coffee, Pill, PawPrint,
  Wrench, Car, Bike, Shirt, Footprints, Hammer, Smartphone, Laptop, Flower2,
  BookOpen, Gift, Scissors, Sparkles, Dumbbell, Gamepad2, Music, Camera,
  Baby, Home, Hospital, Stethoscope, GraduationCap, Briefcase, Package,
  Truck, Heart, Star, Tag, Leaf, Fish, Drumstick, Salad, Soup, CupSoda,
} as const;

export type CategoriaIconName = keyof typeof CATEGORIA_ICONS;

export const CATEGORIA_ICON_NAMES = Object.keys(CATEGORIA_ICONS) as CategoriaIconName[];

export function getCategoriaIcon(name: string | null | undefined) {
  if (!name) return null;
  return (CATEGORIA_ICONS as Record<string, any>)[name] ?? null;
}
