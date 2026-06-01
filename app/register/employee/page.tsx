import { redirect } from "next/navigation";

export default function RegisterEmployeePage() {
  redirect("/login?notice=no-public-signup");
}
