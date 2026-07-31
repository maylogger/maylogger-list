import { Button } from "@/components/ui/button";
import type { Story, StoryDefault } from "@/types/ladle";

export default {
  title: "UI / Button",
} satisfies StoryDefault;

export const Default: Story = () => <Button>Default</Button>;

export const Secondary: Story = () => <Button variant="secondary">Secondary</Button>;

export const Outline: Story = () => <Button variant="outline">Outline</Button>;

export const Destructive: Story = () => <Button variant="destructive">Destructive</Button>;

export const Disabled: Story = () => <Button disabled>Disabled</Button>;
