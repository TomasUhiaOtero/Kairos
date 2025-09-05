import React, { useEffect } from "react"
import rigoImageUrl from "../assets/img/rigo-baby.jpg";
import useGlobalReducer from "../hooks/useGlobalReducer.jsx";

export const Home = () => {

	const { store, dispatch } = useGlobalReducer()

	const loadMessage = async () => {
		try {
			const backendUrl = import.meta.env.VITE_BACKEND_URL

			if (!backendUrl) throw new Error("VITE_BACKEND_URL is not defined in .env file")

			const response = await fetch(backendUrl + "/api/hello")
			const data = await response.json()

			if (response.ok) dispatch({ type: "set_hello", payload: data.message })

			return data

		} catch (error) {
			if (error.message) throw new Error(
				`Could not fetch the message from the backend.
				Please check if the backend is running and the backend port is public.`
			);
		}

	}

	useEffect(() => {
		loadMessage()
	}, [])

	return (
		   <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-green-500 rounded-full mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ¡Tailwind funciona! 🎉
          </h1>
          
          <p className="text-gray-600 mb-6">
            Si ves este diseño con colores y estilos, Tailwind CSS está funcionando correctamente.
          </p>
          
          <div className="space-y-4">
            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105">
              Botón de prueba
            </button>
            
            <div className="flex space-x-2">
              <div className="flex-1 bg-red-100 text-red-800 p-3 rounded text-sm">
                Rojo
              </div>
              <div className="flex-1 bg-yellow-100 text-yellow-800 p-3 rounded text-sm">
                Amarillo
              </div>
              <div className="flex-1 bg-green-100 text-green-800 p-3 rounded text-sm">
                Verde
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-xs text-gray-500">
            <p>Si esto se ve bien, ¡Tailwind está listo para usar!</p>
          </div>
        </div>
      </div>
    </div>
	);
}; 