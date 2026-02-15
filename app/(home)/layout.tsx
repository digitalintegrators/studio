import "../globals.css";
import Header from "../components/common/header";
import Footer from "../components/common/footer";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col bg-gradient-radial-primary text-neutral-300">
            <Header />
            <main className="flex-1 w-full max-w-6xl mx-auto py-10 px-3 sm:px-6">
                {children}
            </main>
            <Footer />
        </div>
    );
}
