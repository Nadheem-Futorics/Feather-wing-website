import Preloader from "@/components/Preloader";
import Navbar from "@/components/Navbar";
import CustomCursor from "@/components/CustomCursor";
import HeroJourney from "@/components/HeroJourney";
import DestinationsGallery from "@/components/DestinationsGallery";
import About from "@/components/About";
import Services from "@/components/Services";
import FeaturedTrips from "@/components/FeaturedTrips";
import WhyTravel from "@/components/WhyTravel";
import Testimonials from "@/components/Testimonials";
import Enquiry from "@/components/Enquiry";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import StickyMobileBar from "@/components/StickyMobileBar";
import ChatWidget from "@/components/ChatWidget";

export default function Home() {
  return (
    <>
      <Preloader />
      <CustomCursor />
      <Navbar />
      <main id="main-content">
        <HeroJourney />
        <DestinationsGallery />
        <About />
        <Services />
        <FeaturedTrips />
        <WhyTravel />
        <Testimonials />
        <Enquiry />
        <FinalCTA />
      </main>
      <Footer />
      <StickyMobileBar />
      <ChatWidget />
    </>
  );
}
