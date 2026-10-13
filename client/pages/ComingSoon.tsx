import { motion } from "framer-motion";
import MetaHelmet from "@/components/MetaHelmet";
import BrandLogo from "@/components/BrandLogo";
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from "@/lib/siteMeta";

export default function ComingSoon() {
  return (
    <main className="relative min-h-screen overflow-x-clip overflow-hidden bg-delache-950 text-white">
      <MetaHelmet
        title="Estamos por llegar"
        description="DELACHE está construyendo una nueva forma de entender los peritajes eléctricos: más precisa, más transparente y completamente conectada. Pronto."
        keywords={[
          "DELACHE",
          "próximamente",
          "peritajes eléctricos",
          "ingeniería de precisión",
          "México",
        ]}
        path="/"
        themeColor="#1A1408"
        colorScheme="dark"
        jsonLd={[buildOrganizationJsonLd(), buildWebSiteJsonLd()]}
      />
      <motion.div
        animate={{ backgroundPosition: ["0px 0px", "64px 64px"] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(230,171,64,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(230,171,64,.08)_1px,transparent_1px)] [background-size:64px_64px]"
      />
      <motion.div
        animate={{
          x: ["-8%", "8%", "-8%"],
          y: ["-5%", "5%", "-5%"],
          scale: [1, 1.12, 1],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-1/2 top-1/2 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[130px]"
      />
      <motion.div
        animate={{ x: [0, 90, 0], y: [0, -60, 0], opacity: [0.12, 0.28, 0.12] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-32 top-[-12%] h-[420px] w-[420px] rounded-full bg-primary/25 blur-[110px]"
      />
      <motion.div
        animate={{
          x: [0, -100, 0],
          y: [0, 70, 0],
          opacity: [0.08, 0.24, 0.08],
        }}
        transition={{
          duration: 17,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute bottom-[-14%] right-[-8%] h-[520px] w-[520px] rounded-full bg-[#F0C76A]/15 blur-[125px]"
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
        <motion.span
          animate={{ x: ["-10vw", "110vw"], y: ["65vh", "18vh"] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute h-px w-[28vw] bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        />
        <motion.span
          animate={{ x: ["110vw", "-20vw"], y: ["30vh", "78vh"] }}
          transition={{
            duration: 28,
            repeat: Infinity,
            ease: "linear",
            delay: 4,
          }}
          className="absolute h-px w-[24vw] bg-gradient-to-r from-transparent via-[#F0C76A]/30 to-transparent"
        />
        <motion.span
          animate={{ x: ["20vw", "80vw"], y: ["105vh", "-10vh"] }}
          transition={{
            duration: 24,
            repeat: Infinity,
            ease: "linear",
            delay: 9,
          }}
          className="absolute h-1 w-1 rounded-full bg-primary shadow-[0_0_16px_4px_rgba(230,171,64,.8)]"
        />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-7 sm:px-10 lg:px-14">
        <div className="relative flex flex-1 items-center justify-center py-16">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 flex max-w-3xl flex-col items-center text-center"
          >
            <BrandLogo size="xl" className="mb-10 h-36 sm:h-44" />
            <h1 className="text-[clamp(3.7rem,9vw,8rem)] font-semibold leading-[.9] tracking-[-.085em]">
              Estamos
              <br />
              <span className="text-primary">por llegar.</span>
            </h1>
            <p className="mt-8 max-w-xl text-base leading-7 text-white/55 sm:text-lg">
              Estamos construyendo una nueva forma de entender los peritajes
              eléctricos: más precisa, más transparente y completamente
              conectada.
            </p>
          </motion.section>
        </div>
        <footer className="flex justify-center border-t border-white/10 pt-5 text-[10px] text-white/30">
          <span>© 2024 DELACHE. Ingeniería de precisión.</span>
        </footer>
      </div>
    </main>
  );
}
