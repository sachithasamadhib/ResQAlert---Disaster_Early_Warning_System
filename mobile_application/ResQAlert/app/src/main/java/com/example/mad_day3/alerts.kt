package com.example.mad_day3

import android.app.Dialog
import android.os.Bundle
import android.util.Log
import androidx.fragment.app.Fragment
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.example.mad_day3.Controller.LandSlideItem
import com.example.mad_day3.Controller.getCityName
import com.example.mad_day3.Controller.landSlideAdapter
import com.example.mad_day3.Controller.loadCardsController
import com.google.firebase.Firebase
import com.google.firebase.firestore.firestore
private const val ARG_PARAM1 = "param1"
private const val ARG_PARAM2 = "param2"
class alerts : Fragment() {
    val db = Firebase.firestore
    private var param1: String? = null
    private var param2: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        arguments?.let {
            param1 = it.getString(ARG_PARAM1)
            param2 = it.getString(ARG_PARAM2)
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_alerts, container, false)
    }
//    private fun setupRecyclerView(view: View, items: List<LandSlideItem>) {
//        val landSlideRecyclerView = view.findViewById<RecyclerView>(R.id.recycleview)
//        landSlideRecyclerView.layoutManager = LinearLayoutManager(requireContext())
//        landSlideRecyclerView.adapter = landSlideAdapter(items)
//        Log.d("AlertsFragment", "RecyclerView adapter set with ${items.size} items")
//    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        val cityName = getCityName().getCityName(requireContext())
        view.findViewById<TextView>(R.id.locationText).text = "Current location: $cityName"
        val loadCardsObj = loadCardsController()
        view.findViewById<RecyclerView>(R.id.recycleview).visibility = View.GONE
        loadCardsObj.getLandslideCard(view, savedInstanceState, requireContext(), cityName)
//        if(cityName == "Gampaha"){
//            view.findViewById<RecyclerView>(R.id.recycleviewRainfall).visibility = View.GONE
//
//        }else if(cityName == "Rathnapura"){
//            view.findViewById<RecyclerView>(R.id.recycleview).visibility = View.GONE
//            loadCardsObj.getLandslideCard(view, savedInstanceState, requireContext(), cityName)
//        }
    }

    companion object {
        @JvmStatic
        fun newInstance(param1: String, param2: String) =
            alerts().apply {
                arguments = Bundle().apply {
                    putString(ARG_PARAM1, param1)
                    putString(ARG_PARAM2, param2)
                }
            }
    }
}