import { Outlet } from "react-router-dom";

const AdminLayout = () => {
  return (
    <>
      <div className="p-4 text-slate-700 text-sm">Khu vực quản trị</div>
      <Outlet />
    </>
  )
}

export default AdminLayout;
