export type DbCartItem = {
  cart_item_id: number;
  product_id: number;
  variant_id: number | null;

  title: string;
  slug: string;
  image_url: string | null;

  qty: number;
  unit_price: number;
  line_total: number;

  duration_label: string | null;
  device_label: string | null;
};
