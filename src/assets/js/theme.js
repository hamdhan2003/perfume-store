(function () {
    const root = document.documentElement;
    const savedTheme = localStorage.getItem("theme");
  
    if (savedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  
    window.toggleTheme = function () {
      const isDark = root.classList.toggle("dark");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    };
  })();
  