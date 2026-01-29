import { User, Store, ArrowRight, LayoutDashboard } from "lucide-react";
import { SignUpButton } from "@clerk/clerk-react";

const ChooseRole = () => {
    const roleForNewAccount = role => {
        localStorage.setItem("roleForNewAccount", role);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] relative overflow-hidden">
            {/* Trang trí nền nhẹ nhàng */}
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-green-500 via-blue-500 to-indigo-500"></div>
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-green-100 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50"></div>

            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 hover:scale-105"
                style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')`,
                }}
            >
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-4xl px-6">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className="text-green-600 font-bold tracking-widest uppercase text-sm mb-3">
                        Trải nghiệm bắt đầu từ đây
                    </h2>
                    <h1 className="text-4xl text-white font-extrabold mb-4">
                        Chào bạn, vai trò của bạn là gì?
                    </h1>
                    <p className="text-white text-lg">
                        Hãy chọn loại tài khoản để chúng tôi tối ưu giao diện cho bạn.
                    </p>
                </div>

                {/* Selection Cards */}
                <div className="grid md:grid-cols-2 gap-8">

                    {/* Option: Customer */}
                    <SignUpButton forceRedirectUrl="/after-signup">
                        <button
                            onClick={() => roleForNewAccount("customer")}
                            className="group relative bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-green-500 hover:shadow-2xl hover:shadow-green-100 transition-all duration-300 text-left"
                        >
                            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                                <User className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">Tôi là Người đặt sân</h3>
                            <p className="text-gray-500 mb-6 leading-relaxed">
                                Tìm kiếm sân bóng gần bạn, xem lịch trống và đặt sân chỉ trong 30 giây.
                            </p>
                            <div className="flex items-center text-green-600 font-bold group-hover:gap-2 transition-all">
                                Bắt đầu ngay <ArrowRight className="w-5 h-5 ml-2" />
                            </div>
                        </button>
                    </SignUpButton>

                    {/* Option: Owner */}
                    <SignUpButton forceRedirectUrl="/after-signup">
                        <button
                            onClick={() => roleForNewAccount("owner")}
                            className="group relative bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-300 text-left"
                        >
                            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                                <Store className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">Tôi là Chủ sân bóng</h3>
                            <p className="text-gray-500 mb-6 leading-relaxed">
                                Quản lý danh sách sân, theo dõi doanh thu và lịch trình đặt sân chuyên nghiệp.
                            </p>
                            <div className="flex items-center text-indigo-600 font-bold group-hover:gap-2 transition-all">
                                Quản lý ngay <LayoutDashboard className="w-5 h-5 ml-2" />
                            </div>
                        </button>
                    </SignUpButton>

                </div>
            </div>
        </div>
    );
};

export default ChooseRole;